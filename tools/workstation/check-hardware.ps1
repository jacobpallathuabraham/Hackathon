<#
  ERLY workstation check — run on your laptop (Windows PowerShell 5.1 or PowerShell 7):

      powershell -ExecutionPolicy Bypass -File tools\workstation\check-hardware.ps1

  Read-only: it only READS system information (nothing is installed, changed or
  uploaded) and writes two files next to this script:
      hardware-report.md   (human-readable)
      hardware-report.json (machine-readable, for the setup guide)

  It answers the questions the avatar/AI workflow depends on:
    * CPU architecture: ARM64 (e.g. NVIDIA N1X "RTX Spark") or x64 — this decides
      which builds of Blender, Python, PyTorch, CUDA and Audio2Face can run at all;
    * the exact GPU, its driver version and memory (dedicated VRAM, or shared
      memory on a unified-memory system-on-chip);
    * whether nvidia-smi / CUDA is present and which CUDA version the driver supports;
    * RAM, free disk space, Windows build;
    * which tools are already installed (Blender, Node.js, Python, Git, ffmpeg)
      and whether they are native ARM64 or x64 running under emulation.
#>
$ErrorActionPreference = 'SilentlyContinue'
$out = [ordered]@{ generated = (Get-Date).ToString('s') }

# --- OS / CPU ---
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$arch = $env:PROCESSOR_ARCHITECTURE
if ($env:PROCESSOR_ARCHITEW6432) { $arch = $env:PROCESSOR_ARCHITEW6432 }   # a 32-bit/emulated shell on a 64-bit OS
$out.os = [ordered]@{ caption = $os.Caption; version = $os.Version; build = $os.BuildNumber; osArchitecture = $os.OSArchitecture }
$out.machine = [ordered]@{ manufacturer = $cs.Manufacturer; model = $cs.Model; systemType = $cs.SystemType }
$out.cpu = [ordered]@{ name = $cpu.Name.Trim(); architecture = $arch; cores = $cpu.NumberOfCores; logicalProcessors = $cpu.NumberOfLogicalProcessors; maxClockMHz = $cpu.MaxClockSpeed }
$out.isArm64 = ($arch -eq 'ARM64')

# --- memory ---
$out.memory = [ordered]@{ totalGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1); freeGB = [math]::Round($os.FreePhysicalMemory * 1KB / 1GB, 1) }

# --- GPU(s) ---
$gpus = @()
foreach ($g in Get-CimInstance Win32_VideoController) {
  $gpus += [ordered]@{ name = $g.Name; driverVersion = $g.DriverVersion; driverDate = ($g.DriverDate | Out-String).Trim(); adapterRAM_GB_reported = [math]::Round(($g.AdapterRAM -as [double]) / 1GB, 2); videoProcessor = $g.VideoProcessor }
}
# AdapterRAM is a 32-bit field (caps at 4 GB); the registry has the real 64-bit value
$regGpu = @()
Get-ChildItem 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' | ForEach-Object {
  $p = Get-ItemProperty $_.PSPath
  if ($p.'HardwareInformation.qwMemorySize') { $regGpu += [ordered]@{ name = $p.DriverDesc; dedicatedMemoryGB = [math]::Round($p.'HardwareInformation.qwMemorySize' / 1GB, 2) } }
}
$out.gpus = $gpus
$out.gpuMemoryFromRegistry = $regGpu

# --- NVIDIA driver / CUDA ---
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if (-not $smi) { $c = 'C:\Windows\System32\nvidia-smi.exe'; if (Test-Path $c) { $smi = Get-Item $c } }
if ($smi) {
  $q = & $smi.Source --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader 2>$null
  $hdr = & $smi.Source 2>$null | Select-String 'CUDA Version'
  $out.nvidia = [ordered]@{ smi = $smi.Source; query = ($q -join '; '); header = ($hdr -join ' ').Trim() }
} else { $out.nvidia = [ordered]@{ smi = $null; note = 'nvidia-smi not found (no NVIDIA driver, or a driver package that does not ship it on this platform)' } }
$nvcc = Get-Command nvcc -ErrorAction SilentlyContinue
$out.cudaToolkit = if ($nvcc) { (& nvcc --version 2>$null | Select-String 'release') -join ' ' } else { 'not installed (not needed for ERLY: the website uses WebGL/WebGPU, Blender ships its own GPU kernels)' }

# --- storage ---
$out.drives = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { [ordered]@{ drive = $_.DeviceID; sizeGB = [math]::Round($_.Size / 1GB); freeGB = [math]::Round($_.FreeSpace / 1GB) } })

# --- tools (and whether they are native ARM64) ---
function BinArch($path) {
  try {
    $fs = [System.IO.File]::OpenRead($path); $br = New-Object System.IO.BinaryReader($fs)
    $fs.Seek(0x3C, 'Begin') | Out-Null; $pe = $br.ReadInt32(); $fs.Seek($pe + 4, 'Begin') | Out-Null; $m = $br.ReadUInt16(); $fs.Close()
    switch ($m) { 0xAA64 { 'ARM64 (native)' } 0x8664 { 'x64 (runs under Prism emulation on ARM64)' } 0xA641 { 'ARM64EC' } 0x14C { 'x86' } default { 'unknown' } }
  } catch { 'unknown' }
}
$tools = [ordered]@{}
$cands = @{
  blender = @('blender', "$env:ProgramFiles\Blender Foundation\*\blender.exe")
  node = @('node'); python = @('python', 'py'); git = @('git'); ffmpeg = @('ffmpeg')
}
foreach ($k in $cands.Keys) {
  $found = $null
  foreach ($c in $cands[$k]) { $cmd = Get-Command $c -ErrorAction SilentlyContinue; if ($cmd) { $found = $cmd.Source; break }; $g = Get-Item $c -ErrorAction SilentlyContinue | Select-Object -Last 1; if ($g) { $found = $g.FullName; break } }
  if ($found) {
    $ver = switch ($k) { 'blender' { (& $found --version 2>$null | Select-Object -First 1) } 'python' { (& $found --version 2>&1) } default { (& $found --version 2>$null | Select-Object -First 1) } }
    $tools[$k] = [ordered]@{ path = $found; version = "$ver".Trim(); binary = (BinArch $found) }
  } else { $tools[$k] = 'not installed' }
}
$out.tools = $tools

# --- browser GPU features the ERLY website uses ---
$out.webNote = 'Open https://webgpureport.org and chrome://gpu in Edge/Chrome on this laptop to confirm WebGL2 + WebGPU are hardware-accelerated.'

# --- write ---
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $here 'hardware-report.json')
$md = @("# ERLY workstation hardware report", "", "Generated: $($out.generated)", "",
  "| Item | Value |", "|---|---|",
  "| Machine | $($out.machine.manufacturer) $($out.machine.model) ($($out.machine.systemType)) |",
  "| Windows | $($out.os.caption) build $($out.os.build) ($($out.os.osArchitecture)) |",
  "| CPU | $($out.cpu.name) — **$($out.cpu.architecture)**, $($out.cpu.cores) cores / $($out.cpu.logicalProcessors) threads |",
  "| RAM | $($out.memory.totalGB) GB (free now: $($out.memory.freeGB) GB) |")
foreach ($g in $out.gpus) { $md += "| GPU | $($g.name) — driver $($g.driverVersion) |" }
foreach ($g in $out.gpuMemoryFromRegistry) { $md += "| GPU memory | $($g.name): $($g.dedicatedMemoryGB) GB dedicated (0 or small on unified-memory chips: the GPU shares system RAM) |" }
$md += "| nvidia-smi | $(if ($out.nvidia.smi) { $out.nvidia.query + ' · ' + $out.nvidia.header } else { $out.nvidia.note }) |"
$md += "| CUDA toolkit | $($out.cudaToolkit) |"
foreach ($d in $out.drives) { $md += "| Disk $($d.drive) | $($d.freeGB) GB free of $($d.sizeGB) GB |" }
foreach ($k in $out.tools.Keys) { $t = $out.tools[$k]; $md += "| $k | $(if ($t -is [string]) { $t } else { $t.version + ' — ' + $t.binary }) |" }
$md += ""; $md += "ARM64 = $($out.isArm64). See docs/workstation/README.md for what this means for each tool."
$md -join "`n" | Set-Content -Encoding UTF8 (Join-Path $here 'hardware-report.md')
Write-Host ($md -join "`n")
Write-Host "`nSaved hardware-report.md and hardware-report.json in $here"
