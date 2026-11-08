# ERLY on the ASUS ProArt P16 (H7607BA): workstation guide

This guide sets the laptop up to build ERLY's digital humans locally and for free. The browser version still has to run on ordinary student devices.

> **Step 0: measure your own machine.** The details below come from published specifications and launch coverage. None of it has been measured on *your* laptop: ERLY's build agent runs in a cloud container and cannot reach it. Run this first (it only reads system information, and nothing is installed or uploaded):
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File tools\workstation\check-hardware.ps1
> ```
>
> It writes `tools/workstation/hardware-report.md` with the exact items below. If any line contradicts this guide, trust the report and adjust. (The script was written for Windows PowerShell 5.1/7. It could not be executed in the Linux build container.)

## 1. Hardware compatibility report

| Item | What published sources say | Why it matters | Verify with |
|---|---|---|---|
| Platform | **NVIDIA RTX Spark "N1X"** system-on-chip (NVIDIA + MediaTek). **Arm64 CPU, not x86.** | Every native tool must be an **ARM64** build. x64-only programs run under Windows' Prism emulation (slower, and drivers and GPU compute may not work). | `check-hardware.ps1` → CPU architecture |
| CPU | 20 Arm cores (retail listings). | Fast for Blender CPU work, glTF optimisation and Node/Python. | report |
| GPU | Blackwell-generation RTX GPU. A Windows-on-Arm GeForce driver lists **6,144 CUDA cores** (RTX 5070-class). | WebGL2/WebGPU in the browser, Blender viewport (OpenGL/Vulkan), and possibly Cycles GPU. | report → GPU, driver |
| GPU memory | **Unified LPDDR5X**, shared between CPU and GPU (no separate VRAM pool). | Large models/scenes compete with system RAM. The 32 GB you mentioned is the total for *both*. Retail listings also show 64 GB and 128 GB versions. | report → RAM, GPU memory |
| OS | Windows 11 (Home/Pro) on Arm. | Decides which installers you can use. | report → OS |
| Storage | 1 TB NVMe on several SKUs (unverified for yours). | See the storage budget below. | report → disks |
| NVIDIA driver / CUDA | NVIDIA ships a Windows-on-Arm GeForce driver. Launch coverage says Blender, DaVinci and ComfyUI partner support with CUDA/OptiX is coming. This is a **vendor claim**: I found no independent confirmation of the CUDA toolkit or OptiX in Blender's Windows ARM64 build. | Decides Cycles GPU rendering and any local CUDA inference. | `nvidia-smi` line in the report; Blender → Preferences → System → Cycles Render Devices |

Sources:
- [hwbusters: Windows-on-Arm GeForce driver confirms N1X core counts](https://hwbusters.com/news/nvidias-first-windows-on-arm-geforce-driver-just-confirmed-the-n1x-specs/)
- [Tom's Hardware: NVIDIA enters the Windows PC market with RTX Spark](https://www.tomshardware.com/laptops/nvidia-enters-the-windows-pc-market-with-rtx-spark)
- [Notebookcheck: N1X confirmed as RTX Spark](https://www.notebookcheck.net/Nvidia-N1X-officially-confirmed-to-arrive-as-the-RTX-Spark.1312010.0.html)
- [kelaptop ProArt P16 H7607BA listings](https://kelaptop.com/nl/asus-proart-p16-h7607ba-se041x-90nb16a1-m00jk0)
- [Blender for Windows on Arm (code.blender.org)](https://code.blender.org/2025/08/blender-for-windows-on-arm/)

## 2. Recommended free software, checked against ARM64

| Tool | Use in ERLY | Licence and cost | Windows ARM64? | Verdict |
|---|---|---|---|---|
| **Blender** (≥ 4.5 LTS) | Modelling, sculpting, rigging, materials, test renders | GPL, free | **Yes**, official ARM64 builds (experimental from 4.3). The Vulkan backend helps on Arm GPUs. | ✅ Install the **ARM64** build. Cycles **GPU** on N1X is unverified; `build_character.py` reports which backend it found (OptiX → CUDA → CPU). |
| **MPFB 2** (MakeHuman for Blender) | Original parametric humans with ARKit face units and Meta visemes | Code GPL-3. **MakeHuman system assets CC0**, so exported characters can ship publicly. Free. | Pure Python inside Blender, so architecture-independent | ✅ |
| **TalkingHead** (met4citizen) | Browser face and body animation, lip-sync, gestures (used by ERLY) | **MIT**, free | Browser | ✅ Already integrated (`assets/vendor/talkinghead`, v1.8.2) |
| **three.js** | Browser rendering | MIT | Browser | ✅ (r170 vendored) |
| **glTF-Transform + meshoptimizer + sharp** | Validate and compress GLBs | MIT / MIT / Apache-2.0 | Node ARM64 builds; sharp ships win32-arm64 binaries; meshoptimizer is WASM | ✅ `tools/avatar-pipeline/optimize.mjs` |
| **Node.js** LTS | Tests, tooling | MIT | **Yes**, native ARM64 installer | ✅ |
| **Python** 3.12+ | Scripts | PSF | **Yes**, native ARM64 installer | ✅ |
| NVIDIA **Audio2Face-3D** | Audio-driven facial animation | SDK MIT; models under NVIDIA's model licence | Docs list 64-bit **x86** Windows/Linux. An NVIDIA forum thread reports the SDK **does not support ARM64** (DGX Spark build pulled x86 dependencies). | ❌ **Not recommended on N1X.** Use TalkingHead's phoneme rules, or the free alternatives below. |
| **Mixamo** | Extra body animations | Free; **needs an Adobe account**. Animations are royalty-free inside projects, but raw files may not be redistributed. | Web | ⚠️ Optional. ERLY already has procedural gestures (no account needed). |
| CUDA Toolkit / CUDA PyTorch | Local GPU AI | Free | CUDA on Windows-on-Arm is new and unverified. **PyTorch's Windows-ARM64 wheels are CPU-only.** | ❌ Don't install x64 CUDA/PyTorch instructions. Not needed for ERLY. |
| **WebLLM** (already in ERLY), **Transformers.js**, **Silero VAD**, **Kokoro TTS** (via `kokoro-js`/HeadTTS) | On-device AI in the **browser** (WebGPU/WASM) | Apache-2.0 / MIT; model weights Apache-2.0 (Kokoro-82M, Qwen) | Browser WebGPU, so independent of CPU architecture | ✅ The best path for "local AI" on this laptop. See §6. |

Sources:
- [NVIDIA ACE Unreal plugin: Audio2Face requirements](https://docs.nvidia.com/ace/ace-unreal-plugin/latest/ace-unreal-plugin-audio2face.html)
- [NVIDIA forum: Audio2Face-3D SDK on DGX Spark (ARM64)](https://forums.developer.nvidia.com/t/audio2face-3d-sdk-build-failure-on-dgx-spark-x86-64-dependencies-downloaded-instead-of-arm64/354202)
- [TalkingHead README: avatars, licences, MPFB guide](https://github.com/met4citizen/TalkingHead)

## 3. Installation (ARM64), in order

```powershell
# 1. Blender ARM64 — download "Windows ARM64" from https://www.blender.org/download/ (not the x64 .msi)
# 2. MPFB: Blender → Edit → Preferences → Get Extensions → allow online access → search "MPFB" → Install
#    then MPFB tab → System and resources → Web resources → Asset packs: download
#    "MakeHuman system assets", "Visemes 02", "Faceunits 01" (+ any skins/hair/clothes packs you like)
#    and install each with Apply assets → Library settings → Load pack from zip file
# 3. TalkingHead rig for MPFB (one time) — follow https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/MPFB.md
#    (talkinghead.mpfbskel + talkinghead.mhw → MPFB "Save rig to library" as "talkinghead")
# 4. Node.js LTS ARM64 — https://nodejs.org (choose "Windows ARM64 Installer")
winget install --id OpenJS.NodeJS.LTS --architecture arm64
# 5. Git
winget install --id Git.Git
# 6. this repo's avatar tools
cd tools\avatar-pipeline
npm install
```

**Do not install** the x64 CUDA Toolkit, CUDA builds of PyTorch, or the Audio2Face SDK on this machine.

## 4. The character pipeline (implemented in this repo)

1. **Create** (Blender + MPFB, on the laptop):
   ```powershell
   blender --background --python tools\avatar-pipeline\build_character.py -- --character tools\avatar-pipeline\characters\karim.json --out build\karim-raw.glb --blend build\karim.blend --render build\karim-preview.png
   ```
   - This builds an **original** male educator (no real person's likeness) from the parametric phenotype in `karim.json`.
   - It adds the Mixamo-compatible TalkingHead rig (all fingers, eye bones) and the 52 ARKit face units plus the Oculus visemes.
   - It exports a GLB, keeps the full-quality `.blend` locally, and renders a GPU portrait. The report says whether OptiX, CUDA or the CPU was used.
   - Further characters: `characters/priya.json` (Indian educator) and `characters/lecturer.json`.
2. **Refine** in Blender: skin roughness and normal detail, hair cards, clothing.
3. **Validate and optimise** for the web:
   ```powershell
   cd tools\avatar-pipeline
   node optimize.mjs ..\..\build\karim-raw.glb ..\..\assets\models\people\karim.glb
   ```
   - It refuses models whose face or body cannot animate (missing bones or visemes). See §7.
   - It then compresses the textures to WebP (≤ 2048 px) and the geometry with meshopt.
4. **Register** in `assets/js/companion/avatar.js` (`DH` list) with `engine: 'dh'`.
5. **Test** in `avatar-lab.html` and with `tests/e2e/avatar-lab.e2e.js`.

Status:
- Steps 3–5 are implemented and tested on ERLY's current character (Aisha, CC0).
- Steps 1–2 could not run in the cloud container, because the MakeHuman asset servers are blocked there. **Karim does not exist as a model yet.** Building him needs this laptop, or any machine with Blender + MPFB.

## 5. Storage budget

| What | Size |
|---|---|
| Blender ARM64 | ~1 GB installed |
| MPFB + MakeHuman system assets + visemes/faceunits | ~1–2 GB |
| Extra skin/hair/clothes packs | 0.2–1 GB each |
| Working `.blend` per character (with 4K textures) | 0.2–1 GB |
| Node + tools/avatar-pipeline `node_modules` | ~0.3 GB |
| Optional browser AI models (cached by the browser) | Qwen 3 1.7B q4 ≈ 1.1 GB; Whisper base ≈ 0.15 GB; Kokoro-82M ≈ 0.1–0.3 GB |
| **Total working budget** | **~5–10 GB** |

## 6. What runs where

| Workload | Where | Notes |
|---|---|---|
| Character modelling, rigging, test renders, GLB optimisation | **Laptop** (local, free) | Blender ARM64. Cycles GPU only if your report shows OptiX/CUDA; otherwise use Cycles CPU on the 20 cores or Eevee. |
| Avatar rendering, lip-sync, gestures, interactive visuals | **Student's browser** | WebGL2. Adaptive resolution. Pauses when the tab is hidden. |
| Speech recognition and voice (default) | **Student's browser** | Web Speech API (quality depends on browser and OS voices). |
| On-device AI answers (optional) | **Student's browser** (WebGPU) | WebLLM, already in ERLY. On 32 GB unified memory, models up to ~8B parameters at 4-bit (~5 GB) are practical; 14B at 4-bit (~9 GB) is possible but slow. Phones and older laptops should use the hosted brain. |
| Strong hosted LLM (Claude / OpenAI), real-time speech-to-speech, ElevenLabs voice | **Backend** (`server/cloudflare-worker.mjs`, `server/llm-proxy.mjs`) | Needs API keys stored as server secrets. **Never in GitHub Pages.** Paid per use. |
| Audio2Face-quality audio-driven faces | GPU **x86** server (not this laptop) | Optional; not needed for ERLY's current lip-sync. |

Free browser speech upgrades that would also run on this laptop. These are **not yet integrated**. Their CDN and model hosts were blocked in the build container, so they could not be tested:
- [Silero VAD](https://github.com/snakers4/silero-vad) (MIT) for robust end-of-turn detection;
- [Transformers.js](https://huggingface.co/docs/transformers.js) Whisper for speech-to-text without a server;
- Kokoro-82M TTS (Apache-2.0) for a far more natural free voice with timestamps for lip-sync.

## 7. What was audited and measured (in the build container)

Results of the `optimize.mjs --check-only` audit:
- **Old Rocketbox "Karim":** **0 of 54** required bones (Biped skeleton, not Mixamo naming), 41/52 ARKit shapes, 13/14 visemes, ~22k vertices, photo-textured low-poly head. This is the root cause of the "old video-game character" look and of the unnatural mouth.
- **New Aisha (MPFB, CC0):** 54/54 bones, 52/52 ARKit, 14/14 visemes, 53k vertices. Separate high-poly eyes, teeth, tongue, eyebrow and eyelash meshes. Optimised from 35.1 MB to 5.1 MB.
- Frame-rate, GPU-utilisation and memory numbers from the build container are **software-rendered** (SwiftShader, ~4 fps) and do not represent your laptop. Open `avatar-lab.html` on the laptop to see real FPS, GPU name, JS heap and lip-sync timing.
