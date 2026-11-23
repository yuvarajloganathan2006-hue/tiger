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
$backendCommand = "Set-Location '$CorePath'; & '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8765"
$frontendCommand = "Set-Location '$WebPath'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173"
Write-Host "TIGER launched. Backend: http://127.0.0.1:8765/docs" -ForegroundColor Green
