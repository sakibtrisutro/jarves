<#
.SYNOPSIS
    Creates timestamped backup of JARVIS operational SQLite database
#>

$projectRoot = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $projectRoot "data\jarvis_operational.db"
$backupsDir = Join-Path $projectRoot "backups"

if (-not (Test-Path $backupsDir)) {
    New-Item -ItemType Directory -Force -Path $backupsDir | Out-Null
}

if (Test-Path $dbPath) {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $backupTarget = Join-Path $backupsDir "jarvis_backup_$timestamp.db"
    Copy-Item $dbPath $backupTarget
    Write-Host "✓ SQLite Database backed up to: $backupTarget" -ForegroundColor Green
} else {
    Write-Host "⚠️ No database found at $dbPath to backup." -ForegroundColor Yellow
}
