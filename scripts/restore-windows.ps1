<#
.SYNOPSIS
    Restores latest database backup to active JARVIS operational SQLite database
#>

$projectRoot = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $projectRoot "data\jarvis_operational.db"
$backupsDir = Join-Path $projectRoot "backups"

if (Test-Path $backupsDir) {
    $latestBackup = Get-ChildItem -Path $backupsDir -Filter "jarvis_backup_*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestBackup) {
        Write-Host "Found latest backup: $($latestBackup.FullName)" -ForegroundColor Cyan
        Copy-Item $latestBackup.FullName $dbPath -Force
        Write-Host "✓ Database successfully restored from $($latestBackup.Name)" -ForegroundColor Green
    } else {
        Write-Host "❌ No database backups found in $backupsDir" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Backups folder does not exist at $backupsDir" -ForegroundColor Red
}
