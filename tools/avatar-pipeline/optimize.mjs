// ERLY avatar pipeline — validate + optimise a digital-human GLB for the website.
//
//   npm install            (once, in tools/avatar-pipeline)
//   node optimize.mjs <input.glb> <output.glb> [--max-texture 2048] [--check-only]
//
// 1. VALIDATES the character against what ERLY's engine (TalkingHead) needs:
//    Mixamo-style skeleton incl. every finger bone, LeftEye/RightEye, 52 ARKit face
//    shapes and the Oculus visemes. Missing items are listed — fix them in Blender
//    before exporting, rather than shipping a model whose face cannot animate.
// 2. OPTIMISES losslessly-for-the-web: dedup + prune, textures → WebP (resized to
//    --max-texture), sparse morph targets, Meshopt geometry compression.
// The high-quality source (.blend / raw GLB) stays on your workstation; only the
// optimised GLB goes into assets/models/people/.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, sparse, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [input, output] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--max')));
if (!input) { console.error('usage: node optimize.mjs <input.glb> <output.glb> [--max-texture 2048] [--check-only]'); process.exit(2); }

export const BONES = 'Hips,Spine,Spine1,Spine2,Neck,Head,LeftEye,RightEye,LeftShoulder,LeftArm,LeftForeArm,LeftHand,LeftHandThumb1,LeftHandThumb2,LeftHandThumb3,LeftHandIndex1,LeftHandIndex2,LeftHandIndex3,LeftHandMiddle1,LeftHandMiddle2,LeftHandMiddle3,LeftHandRing1,LeftHandRing2,LeftHandRing3,LeftHandPinky1,LeftHandPinky2,LeftHandPinky3,RightShoulder,RightArm,RightForeArm,RightHand,RightHandThumb1,RightHandThumb2,RightHandThumb3,RightHandIndex1,RightHandIndex2,RightHandIndex3,RightHandMiddle1,RightHandMiddle2,RightHandMiddle3,RightHandRing1,RightHandRing2,RightHandRing3,RightHandPinky1,RightHandPinky2,RightHandPinky3,LeftUpLeg,LeftLeg,LeftFoot,LeftToeBase,RightUpLeg,RightLeg,RightFoot,RightToeBase'.split(',');
export const ARKIT = 'browDownLeft,browDownRight,browInnerUp,browOuterUpLeft,browOuterUpRight,cheekPuff,cheekSquintLeft,cheekSquintRight,eyeBlinkLeft,eyeBlinkRight,eyeLookDownLeft,eyeLookDownRight,eyeLookInLeft,eyeLookInRight,eyeLookOutLeft,eyeLookOutRight,eyeLookUpLeft,eyeLookUpRight,eyeSquintLeft,eyeSquintRight,eyeWideLeft,eyeWideRight,jawForward,jawLeft,jawOpen,jawRight,mouthClose,mouthDimpleLeft,mouthDimpleRight,mouthFrownLeft,mouthFrownRight,mouthFunnel,mouthLeft,mouthLowerDownLeft,mouthLowerDownRight,mouthPressLeft,mouthPressRight,mouthPucker,mouthRight,mouthRollLower,mouthRollUpper,mouthShrugLower,mouthShrugUpper,mouthSmileLeft,mouthSmileRight,mouthStretchLeft,mouthStretchRight,mouthUpperUpLeft,mouthUpperUpRight,noseSneerLeft,noseSneerRight,tongueOut'.split(',');
export const VISEMES = 'viseme_PP,viseme_FF,viseme_TH,viseme_DD,viseme_kk,viseme_CH,viseme_SS,viseme_nn,viseme_RR,viseme_aa,viseme_E,viseme_I,viseme_O,viseme_U'.split(',');

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const t0 = Date.now();
const doc = await io.read(input);
const root = doc.getRoot();
const nodes = new Set(root.listNodes().map(n => n.getName().replace(/^mixamorig:?/, '')));
const morphs = new Set(); root.listMeshes().forEach(m => (m.getExtras().targetNames || []).forEach(n => morphs.add(n)));
let verts = 0; root.listMeshes().forEach(m => m.listPrimitives().forEach(p => { verts += p.getAttribute('POSITION').getCount(); }));
const missing = { bones: BONES.filter(b => !nodes.has(b)), arkit: ARKIT.filter(n => !morphs.has(n)), visemes: VISEMES.filter(n => !morphs.has(n)) };
const report = {
  input, sizeMB: +(fs.statSync(input).size / 1048576).toFixed(2), vertices: verts, meshes: root.listMeshes().length, materials: root.listMaterials().length,
  textures: root.listTextures().map(t => { const s = t.getSize(); return `${t.getName() || '(unnamed)'} ${s ? s.join('×') : '?'}`; }),
  skeleton: { root: nodes.has('Armature') ? 'Armature' : '(no node named "Armature" — TalkingHead falls back to the scene root)', missing: missing.bones },
  face: { arkit: `${ARKIT.length - missing.arkit.length}/${ARKIT.length}`, visemes: `${VISEMES.length - missing.visemes.length}/${VISEMES.length}`, missingArkit: missing.arkit, missingVisemes: missing.visemes }
};
const ok = !missing.bones.length && !missing.visemes.length && missing.arkit.filter(n => n !== 'tongueOut').length <= 4;
report.compatible = ok;
if (flag('--check-only') || !output) { console.log(JSON.stringify(report, null, 2)); process.exit(ok ? 0 : 1); }
if (!ok) { console.error(JSON.stringify(report, null, 2)); console.error('\nNot compatible with ERLY’s face/body animation — fix the items above in Blender, then export again.'); process.exit(1); }
const max = +opt('--max-texture', 2048);
await doc.transform(dedup(), prune(), textureCompress({ encoder: (await import('sharp')).default, targetFormat: 'webp', resize: [max, max], quality: 88 }), sparse({ ratio: 0.3 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(output, doc);
report.output = output; report.outputMB = +(fs.statSync(output).size / 1048576).toFixed(2); report.seconds = (Date.now() - t0) / 1000;
console.log(JSON.stringify(report, null, 2));
