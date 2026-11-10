<#
.SYNOPSIS
    Safely uninstalls Desktop launcher shortcut and cleans generated temp logs
#>

$projectRoot = Split-Path -Parent $PSScriptRoot
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "Start JARVIS.lnk"

Write-Host "JARVIS Uninstallation Procedure" -ForegroundColor Yellow

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "  [OK] Desktop shortcut removed." -ForegroundColor Green
}

Write-Host "Notice: Operational data in ./data and backups in ./backups were PRESERVED for safety." -ForegroundColor Cyan
Write-Host "To remove JARVIS completely, delete the project folder directly." -ForegroundColor Gray
