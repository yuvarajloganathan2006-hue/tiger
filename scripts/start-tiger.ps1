$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$CorePath = Join-Path $RepoRoot "services\core"
$WebPath = Join-Path $RepoRoot "apps\web"
$python = Join-Path $CorePath ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "TIGER is not set up. Run .\scripts\setup-windows.ps1 first." }
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw "Ollama is required for fully-local mode." }
try { Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null }
catch { Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Minimized; Start-Sleep -Seconds 3 }
if (-not $env:TIGER_LOCAL_MODEL) { $env:TIGER_LOCAL_MODEL = "qwen3:8b" }

$hostAddress = "127.0.0.1"
$mobileChoice = Read-Host "Pair an Android phone over your trusted local Wi-Fi? (y/N)"
if ($mobileChoice -match "^(y|yes)$") {
    $hostAddress = "0.0.0.0"
    $tokenDirectory = Join-Path $env:USERPROFILE ".tiger"
    New-Item -ItemType Directory -Force -Path $tokenDirectory | Out-Null
    $tokenFile = Join-Path $tokenDirectory "mobile-access-token.txt"
    if (-not (Test-Path $tokenFile)) {
        $token = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
        Set-Content -Path $tokenFile -Value $token -NoNewline
    }
    $env:TIGER_API_TOKEN = (Get-Content -Raw $tokenFile).Trim()
    Write-Host "Android pairing token (keep private): $env:TIGER_API_TOKEN" -ForegroundColor Yellow
    Write-Host "On Android, enter http://YOUR-PC-LAN-IP:8765 and this token in Device connection." -ForegroundColor Cyan
    Write-Host "Allow Python/TIGER through Windows Firewall on Private networks only if prompted." -ForegroundColor Yellow
}
$env:TIGER_HOST = $hostAddress
$backendCommand = "Set-Location '$CorePath'; & '$python' -m uvicorn app.main:app --host '$hostAddress' --port 8765"
$frontendCommand = "Set-Location '$WebPath'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173"
Write-Host "TIGER launched. Backend: http://127.0.0.1:8765/docs" -ForegroundColor Green
