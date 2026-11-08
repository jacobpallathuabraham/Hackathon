# ERLY avatar pipeline

Create original, freely licensed digital humans, check that their face and body can animate in ERLY, and compress them for the web.

| File | What it does | Tested |
|---|---|---|
| `build_character.py` | Blender + MPFB: phenotype → skin, eyes, brows, lashes, teeth, tongue, hair, clothes → TalkingHead rig → Meta visemes + ARKit face units → GLB (+ `.blend` + an optional GPU Cycles portrait) | Written against the MPFB 2 source (`HumanService`, `FaceService`, `ExportService`, `AssetService`). **Not run yet**: the MakeHuman asset servers are blocked in ERLY's cloud container. Run it on your workstation. |
| `characters/*.json` | Original characters: Karim (male learning companion), Priya (Indian educator), Dr. Lewis (lecturer) | — |
| `optimize.mjs` | Checks for the 54 bones, 52 ARKit shapes and 14 visemes, then dedup/prune → WebP textures (≤ 2048) → sparse morphs → meshopt | ✅ mpfb.glb 35.1 MB → 5.2 MB, compatible. The Rocketbox Karim fails the check: 0/54 bones, 41/52 ARKit. |

See `docs/workstation/README.md` for installation on the ASUS ProArt P16 (Windows on Arm).

One-time MPFB rig set-up: follow [TalkingHead's MPFB guide](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/MPFB.md) (download `talkinghead.mpfbskel` and `talkinghead.mhw`, then save the rig to the MPFB library as **talkinghead**).

Licences:
- MPFB code: GPL-3. Blender's GPL does not cover your output files.
- MakeHuman system assets: **CC0**, so characters made with them can be used commercially.
- TalkingHead: MIT.
- Check the licence of every extra asset pack you download: some community assets are CC-BY, which requires attribution.
