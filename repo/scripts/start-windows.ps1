<#
.SYNOPSIS
    Starts JARVIS on Windows, verifies backend health, and launches the web dashboard
#>

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       J.A.R.V.I.S. EXECUTIVE OS LAUNCHER                " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if node process is already running on port 3000
$existingPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($existingPort) {
    Write-Host "  [OK] JARVIS is already active on port 3000." -ForegroundColor Green
    Start-Process "http://localhost:3000"
    Exit 0
}

# 2. Launch background process
Write-Host "Launching JARVIS backend server..." -ForegroundColor Yellow
$serverProcess = Start-Process "npm" -ArgumentList "run start" -WorkingDirectory $projectRoot -WindowStyle Minimized -PassThru

# 3. Health verification polling
Write-Host "Waiting for server health verification on http://localhost:3000/api/health..." -ForegroundColor Yellow
$maxAttempts = 20
$healthVerified = $false

for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp -and ($resp.status -eq "healthy" -or $resp.subsystems)) {
            $healthVerified = $true
            Write-Host "  [OK] Backend health check verified in ${i}s." -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  ... waiting for server boot ($i/$maxAttempts)" -ForegroundColor Gray
    }
}

# 4. Launch browser or report failure
if ($healthVerified) {
    Write-Host "Opening web dashboard..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
    Write-Host "  [OK] JARVIS operational at http://localhost:3000" -ForegroundColor Green
    Exit 0
} else {
    Write-Host "  [ERROR] JARVIS server failed to start or respond to health check within $maxAttempts seconds." -ForegroundColor Red
    Write-Host "Please check the logs folder or run diagnostics.bat for details." -ForegroundColor Yellow
    Exit 1
}
