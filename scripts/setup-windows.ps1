$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$CorePath = Join-Path $RepoRoot "services\core"
$WebPath = Join-Path $RepoRoot "apps\web"
$Model = if ($env:TIGER_LOCAL_MODEL) { $env:TIGER_LOCAL_MODEL } else { "qwen3:8b" }

Write-Host "TIGER Windows setup" -ForegroundColor Cyan
foreach ($command in @("py", "npm", "ollama")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command '$command' was not found. Install Python 3.11+, Node.js 20+, and Ollama, then rerun this script."
    }
}
$pythonVersion = & py -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ([version]$pythonVersion -lt [version]"3.11") { throw "Python 3.11 or newer is required. Detected $pythonVersion." }
if (-not (Test-Path (Join-Path $CorePath ".venv"))) { & py -m venv (Join-Path $CorePath ".venv") }
$python = Join-Path $CorePath ".venv\Scripts\python.exe"
& $python -m pip install --upgrade pip
& $python -m pip install -r (Join-Path $CorePath "requirements.txt")
Push-Location $WebPath
try { npm install } finally { Pop-Location }
$models = & ollama list
if ($LASTEXITCODE -ne 0) { throw "Ollama is installed but not responding. Start Ollama and rerun this script." }
if ($models -notmatch [regex]::Escape($Model)) {
    Write-Host "Downloading local model $Model. This may take several minutes and several GB." -ForegroundColor Yellow
    & ollama pull $Model
    if ($LASTEXITCODE -ne 0) { throw "Could not download model $Model." }
}
Write-Host "Setup complete. Run .\scripts\start-tiger.ps1 to launch TIGER." -ForegroundColor Green
