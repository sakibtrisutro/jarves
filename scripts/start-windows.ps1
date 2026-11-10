<#
.SYNOPSIS
    Starts JARVIS on Windows and opens the web dashboard
#>

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Starting JARVIS Executive Operating System..." -ForegroundColor Cyan

# Check if node process is already running on port 3000
$existingPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($existingPort) {
    Write-Host "JARVIS is already running on port 3000." -ForegroundColor Green
    Start-Process "http://localhost:3000"
    Exit 0
}

# Launch server
Start-Process "npm" -ArgumentList "run start" -WorkingDirectory $projectRoot -WindowStyle Minimized

# Wait 2 seconds for server to bind
Start-Sleep -Seconds 2

# Open browser
Start-Process "http://localhost:3000"

Write-Host "✓ JARVIS launched successfully at http://localhost:3000" -ForegroundColor Green
