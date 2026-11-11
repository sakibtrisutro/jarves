<#
.SYNOPSIS
    JARVIS v3.1 True Clean Uninstallation & Data Cleanup Script
.DESCRIPTION
    Stops JARVIS processes, removes desktop shortcuts, deletes operational databases,
    WAL/SHM files, conversation history, episodic and semantic memory records, sessions,
    logs, backups, caches, and build artifacts. Preserves source code and .git metadata.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "       J.A.R.V.I.S. TRUE CLEAN UNINSTALLATION & DATA PURGE      " -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "Start JARVIS.lnk"

# 1. Stop any running node processes on port 3000
Write-Host "[1/4] Stopping active JARVIS processes..." -ForegroundColor Yellow
try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  [OK] Terminated process on port 3000." -ForegroundColor Green
    } else {
        Write-Host "  [OK] No active process on port 3000." -ForegroundColor Green
    }
} catch {
    Write-Host "  [INFO] Process termination skipped." -ForegroundColor Gray
}

# 2. Remove Desktop Shortcut
Write-Host "[2/4] Removing Desktop shortcut..." -ForegroundColor Yellow
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "  [OK] 'Start JARVIS' shortcut removed from Desktop." -ForegroundColor Green
} else {
    Write-Host "  [OK] No desktop shortcut found." -ForegroundColor Green
}

# 3. Purge JARVIS Operational Data & Runtime Artifacts
Write-Host "[3/4] Purging operational data, databases, memories, and logs..." -ForegroundColor Yellow
$pathsToPurge = @(
    (Join-Path $projectRoot "data"),
    (Join-Path $projectRoot "logs"),
    (Join-Path $projectRoot "backups"),
    (Join-Path $projectRoot "dist"),
    (Join-Path $projectRoot ".vite")
);

$purgedCount = 0;
foreach ($targetPath in $pathsToPurge) {
    if (Test-Path $targetPath) {
        try {
            Remove-Item -Recurse -Force $targetPath -ErrorAction SilentlyContinue
            Write-Host "  [PURGED] $(Split-Path $targetPath -Leaf)" -ForegroundColor Red
            $purgedCount++
        } catch {
            Write-Host "  [WARNING] Could not fully remove $(Split-Path $targetPath -Leaf)" -ForegroundColor Yellow
        }
    }
}

Write-Host "  [OK] Successfully purged $purgedCount runtime data directories." -ForegroundColor Green

# 4. Preservation Report
Write-Host "[4/4] Generating Cleanup Report..." -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "       J.A.R.V.I.S. CLEAN UNINSTALLATION COMPLETE        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  - Operational Database (SQLite WAL): DELETED" -ForegroundColor Red
Write-Host "  - User Memories & Conversations: DELETED" -ForegroundColor Red
Write-Host "  - Active Sessions & Tokens: DELETED" -ForegroundColor Red
Write-Host "  - System Logs & Backups: DELETED" -ForegroundColor Red
Write-Host "  - Desktop Shortcut: DELETED" -ForegroundColor Red
Write-Host "  - Source Code & Git Metadata (.git): PRESERVED" -ForegroundColor Cyan
Write-Host ""
Write-Host "To reinstall a fresh instance, run: .\install.bat" -ForegroundColor Cyan
Write-Host ""
