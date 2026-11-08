# ERLY 3D digital humans — asset pipeline

The 3D companions in `assets/models/humans/` come from the **Microsoft Rocketbox Avatar Library**
(https://github.com/microsoft/Microsoft-Rocketbox), released under the **MIT licence**
(`assets/models/humans/LICENSE-Rocketbox.txt`). Please cite:
Gonzalez-Franco et al., "The Rocketbox library and the utility of freely available rigged avatars",
Frontiers in Virtual Reality (2020), DOI 10.3389/frvir.2020.561558.

| ERLY companion | Rocketbox avatar | Role in ERLY |
|---|---|---|
| Karim | Adults/Male_Adult_02 | friendly study companion |
| Layla | Adults/Female_Adult_11 | university tutor |
| Mr. Hart | Adults/Male_Adult_05 | experienced teacher |
| Ms. Grace | Professions/Business_Female_02 | experienced teacher |
| Kwame | Adults/Male_Adult_12 | science instructor |
| Kenji | Adults/Male_Adult_09 | mathematics tutor |
| Dr. Sami | Professions/Medical_Male_01 | doctor (general health information) |
| Dr. Amira | Professions/Medical_Female_01 | doctor (general health information) |
| Zara | Professions/Business_Female_01 | student support counsellor |
| Omar | Professions/Business_Male_05 | academic advisor |
| Mei | Professions/Business_Female_03 | career guidance advisor |
| Noura | Adults/Female_Adult_10 | study coach |
| Faisal | Adults/Male_Adult_21 | mentor |
| Sofia | Adults/Female_Adult_05 | writing tutor |

Animations (`anims_m.glb`, `anims_f.glb`): Rocketbox motion-capture clips — idle, breathing,
listening, nodding, talking (neutral / relaxed / excited), thoughtful, presenting left/right,
waving, soft laugh, shrug.

## Rebuilding (no native binaries needed)
1. `git clone --filter=blob:none --sparse https://github.com/microsoft/Microsoft-Rocketbox` and
   `git sparse-checkout add` the avatar folders and animation files you need.
2. `python3 tex.py <avatar>/Textures out/<Name>` — TGA → web textures (2048 face, 1024 body/normals,
   hair/eyelashes with alpha). Specular maps are dropped (PBR roughness is used instead).
3. `npm install three@0.170.0 @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer@0.21`
   in the repository root (not committed), serve the repo root on port 8777, then
   `node tools/humans/convert.js avatar out/<Name> <Name>_facial.fbx raw.glb` — three.js FBXLoader in a
   headless browser keeps the skinned mesh, rebuilds PBR materials and keeps 56 facial blendshapes
   (15 visemes + ARKit brows/eyes/blink/gaze/jaw/smile/frown/press/pucker…), renamed to ARKit /
   `viseme_*` names; morph normals are dropped.
4. `node tools/humans/opt.mjs raw.glb assets/models/humans/<id>.glb` — dedup, sparse morph targets,
   meshopt compression (≈1.6–4.8 MB per person, most of it textures).
5. Animations: `node tools/humans/convert.js anims <dir> m_idle_neutral_01.max.fbx,... raw.glb` then
   `opt.mjs ... anim` (facial-bone tracks and root drift removed; clips resampled).
