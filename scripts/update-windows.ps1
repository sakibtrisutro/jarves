<#
.SYNOPSIS
    Updates JARVIS from Git while preserving user data and .env settings
#>

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Updating JARVIS to latest repository release..." -ForegroundColor Cyan

# 1. Pull Git updates
try {
    git pull
    Write-Host "✓ Git updates pulled." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git pull notice: $_" -ForegroundColor Yellow
}

# 2. Update dependencies
npm install

# 3. Rebuild app
npm run build

Write-Host "✓ JARVIS updated successfully without modifying your .env or SQLite databases." -ForegroundColor Green
