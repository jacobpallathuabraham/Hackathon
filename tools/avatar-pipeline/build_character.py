"""ERLY avatar pipeline — build an original digital human with Blender + MPFB (MakeHuman, CC0 assets).

Run on the workstation (e.g. the ASUS ProArt P16), NOT in the browser:

    blender --background --python tools/avatar-pipeline/build_character.py -- \
        --character tools/avatar-pipeline/characters/karim.json \
        --out build/karim-raw.glb [--blend build/karim.blend] [--render build/karim-preview.png]

then optimise it for the website:

    cd tools/avatar-pipeline && npm install && node optimize.mjs ../../build/karim-raw.glb ../../assets/models/people/karim.glb

What it does (MPFB 2 Python API, the same calls the MPFB sidebar buttons make):
  1. creates the human from the character file (phenotype: gender, age, muscle,
     weight, height, proportions, ancestry blend) — an ORIGINAL face, not a scan
     of a real person;
  2. equips skin, eyes, eyebrows, eyelashes, teeth, tongue, hair and clothes,
     choosing installed MakeHuman assets by name hints;
  3. adds the TalkingHead rig (Mixamo-compatible bone names incl. every finger
     and LeftEye/RightEye) — see README for the one-time rig install;
  4. loads the Meta/Oculus viseme and ARKit face-unit shape keys (MPFB asset
     packs "Visemes 02" and "Faceunits 01") and interpolates them onto the
     eyebrows/eyelashes/teeth/tongue so the whole face moves together;
  5. makes an export copy, bakes modifiers, removes helper geometry, names the
     root "Armature" and writes a GLB with skins + morph targets;
  6. optionally renders a Cycles portrait using the GPU (OptiX → CUDA → CPU,
     whichever this machine actually supports) and saves the .blend source.

Status: written against MPFB 2.x (services/humanservice.py, faceservice.py,
exportservice.py). It could NOT be run in ERLY's cloud build container because
the MakeHuman asset servers are not reachable there — run it on your machine and
check the printed report (and tools/avatar-pipeline/optimize.mjs --check-only).
"""
import sys, json, argparse, importlib, os, time

import bpy


def log(*a):
    print('[erly-avatar]', *a, flush=True)


def mpfb_module(name):
    """MPFB is a Blender *extension* (4.2+): its package lives under bl_ext.<repository>.mpfb."""
    for base in ('bl_ext.blender_org.mpfb', 'bl_ext.user_default.mpfb', 'mpfb'):
        try:
            return importlib.import_module(base + '.' + name)
        except ImportError:
            continue
    raise SystemExit('MPFB is not installed/enabled. In Blender: Edit → Preferences → Get Extensions → search "MPFB" → Install.')


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--character', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--blend')
    p.add_argument('--render')
    p.add_argument('--samples', type=int, default=128)
    return p.parse_args(argv)


def pick(paths, hints, exclude=()):
    """Choose the installed asset whose path matches the most hints (case-insensitive)."""
    best, score = None, 0
    for path in paths:
        s = str(path).lower()
        if any(x in s for x in exclude):
            continue
        sc = sum(1 for h in hints if h.lower() in s)
        if sc > score:
            best, score = path, sc
    return best


def gpu_setup():
    """Use the best GPU backend Cycles offers on THIS machine; report what was used."""
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            prefs.compute_device_type = backend
            prefs.refresh_devices()
            devs = [d for d in prefs.devices if d.type == backend]
            if devs:
                for d in prefs.devices:
                    d.use = d.type == backend
                bpy.context.scene.cycles.device = 'GPU'
                return backend, [d.name for d in devs]
        except TypeError:
            continue  # this backend is not compiled into this Blender build (e.g. on Windows on Arm)
    bpy.context.scene.cycles.device = 'CPU'
    return 'CPU', []


def main():
    a = args()
    ch = json.load(open(a.character, encoding='utf-8'))
    t0 = time.time()
    HumanService = mpfb_module('services.humanservice').HumanService
    FaceService = mpfb_module('services.faceservice').FaceService
    ExportService = mpfb_module('services.exportservice').ExportService
    AssetService = mpfb_module('services.assetservice').AssetService

    # clean scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    # 1. the human (an original face from parametric sliders)
    info = HumanService._create_default_human_info_dict()
    info['phenotype'].update(ch.get('phenotype', {}))
    # 2. assets by hint — whatever MakeHuman/MPFB packs are installed on this machine
    hints = ch.get('assets', {})
    skins = AssetService.list_mhmat_assets('skins')
    chosen = {}
    if skins and hints.get('skin'):
        chosen['skin_mhmat'] = str(pick(skins, hints['skin']) or '')
    for slot, sub in (('eyes', 'eyes'), ('eyebrows', 'eyebrows'), ('eyelashes', 'eyelashes'), ('teeth', 'teeth'), ('tongue', 'tongue'), ('hair', 'hair')):
        if hints.get(slot):
            found = pick(AssetService.list_mhclo_assets(sub), hints[slot])
            if found:
                chosen[slot] = AssetService.path_to_fragment(found) if hasattr(AssetService, 'path_to_fragment') else str(found)
    clothes = []
    for h in hints.get('clothes', []):
        found = pick(AssetService.list_mhclo_assets('clothes'), h)
        if found:
            clothes.append(AssetService.path_to_fragment(found) if hasattr(AssetService, 'path_to_fragment') else str(found))
    info.update(chosen)
    info['clothes'] = clothes
    info['skin_material_type'] = 'GAMEENGINE'   # PBR materials that export cleanly to glTF
    info['eyes_material_type'] = 'GAMEENGINE'   # also exports cleanly (MPFB's procedural eyes are Blender-only node setups)
    settings = HumanService.get_default_deserialization_settings()
    settings.update({'material_instances': 'NEVER', 'subdiv_levels': 0, 'override_rig': 'PRESET'})
    basemesh = HumanService.deserialize_from_dict(info, settings)
    log('human created', basemesh.name, 'assets:', json.dumps(chosen), 'clothes:', clothes)

    # 3. TalkingHead rig (Mixamo-compatible names, fingers, eye bones)
    rig_names = [r.get('name') for r in AssetService.get_custom_rigs()] if hasattr(AssetService, 'get_custom_rigs') else []
    rig_name = ch.get('rig', 'custom.talkinghead')
    if rig_name.replace('custom.', '') not in [str(n).replace('custom.', '') for n in rig_names]:
        raise SystemExit(f'Custom rig "{rig_name}" is not in the MPFB library yet. Do the one-time rig install in tools/avatar-pipeline/README.md (talkinghead.mpfbskel + talkinghead.mhw from the TalkingHead repository).')
    rig = HumanService.add_custom_rig(basemesh, rig_name, import_weights=True)
    log('rig', rig.name if rig else None)

    # 4. face shapes: Meta/Oculus visemes + ARKit face units
    FaceService.load_targets(basemesh, load_microsoft_visemes=False, load_meta_visemes=True, load_arkit_faceunits=True)

    # 5. export copy → bake → interpolate face shapes onto face assets → GLB
    copy = ExportService.create_character_copy(rig or basemesh, name_suffix='_export')
    copy_root = copy if copy.type == 'ARMATURE' else copy.parent
    meshes = [o for o in (copy_root.children_recursive if copy_root else [copy]) if o.type == 'MESH']
    copy_base = max(meshes, key=lambda o: len(o.data.vertices))
    ExportService.bake_modifiers_remove_helpers(copy_base, bake_masks=True, bake_subdiv=False, remove_helpers=True)
    FaceService.interpolate_targets(copy_base)
    if copy_root:
        copy_root.name = 'Armature'
    for o in bpy.data.objects:
        o.select_set(False)
    for o in [copy_root] + meshes if copy_root else meshes:
        o.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=True, export_skins=True, export_morph=True,
                              export_morph_normal=False, export_animations=False, export_apply=False, export_yup=True)
    keys = sorted({kb.name for m in meshes if m.data.shape_keys for kb in m.data.shape_keys.key_blocks})
    report = {'character': ch.get('name'), 'glb': a.out, 'seconds': round(time.time() - t0, 1), 'meshes': len(meshes),
              'shape_keys': len(keys), 'visemes': len([k for k in keys if k.startswith('viseme_')]), 'bones': len(copy_root.data.bones) if copy_root else 0}

    # 6. optional GPU portrait + .blend source
    if a.render:
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        backend, devices = gpu_setup()
        scene.cycles.samples = a.samples
        scene.cycles.use_denoising = True
        scene.render.resolution_x, scene.render.resolution_y = 1080, 1350
        cam = bpy.data.objects.new('ERLY_cam', bpy.data.cameras.new('ERLY_cam')); scene.collection.objects.link(cam)
        head = copy_root.pose.bones.get('Head') if copy_root else None
        hz = (copy_root.matrix_world @ head.head).z if head else 1.6
        cam.location = (0, -2.4, hz - 0.15); cam.rotation_euler = (1.5708, 0, 0); cam.data.lens = 70; scene.camera = cam
        for name, loc, energy in (('key', (-1.2, -1.6, hz + 0.6), 300), ('fill', (1.4, -1.2, hz), 90), ('rim', (0.6, 1.4, hz + 0.8), 220)):
            L = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA')); L.data.energy = energy; L.data.size = 1.2; L.location = loc
            L.rotation_euler = (0, 0, 0); scene.collection.objects.link(L)
            c = L.constraints.new('TRACK_TO'); c.target = cam if name == 'rim' else copy_base; c.track_axis = 'TRACK_NEGATIVE_Z'
        scene.render.filepath = a.render
        r0 = time.time(); bpy.ops.render.render(write_still=True)
        report.update({'render': a.render, 'render_backend': backend, 'render_devices': devices, 'render_seconds': round(time.time() - r0, 1)})
    if a.blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.blend))
        report['blend'] = a.blend
    log('REPORT', json.dumps(report))


main()
