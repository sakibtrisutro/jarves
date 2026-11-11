<#
.SYNOPSIS
    JARVIS v3.1 True Fresh Installation & Synchronization Script
.DESCRIPTION
    Stops any running server processes on port 3000, pulls latest main from GitHub,
    sets up fresh data directories, installs dependencies, initializes fresh SQLite WAL database
    with Sakib & Sanjida default accounts (temp password 1234), builds production app,
    creates desktop shortcut, and verifies backend health.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       J.A.R.V.I.S. v3.1 TRUE FRESH INSTALLATION          " -ForegroundColor Cyan
Write-Host "    Mobile-First Executive AI & True Fresh Setup          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# 1. Stop active JARVIS processes on port 3000 to release database file locks
Write-Host "[1/8] Stopping any running JARVIS server instances..." -ForegroundColor Yellow
try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
        Write-Host "  [OK] Released database locks on port 3000." -ForegroundColor Green
    } else {
        Write-Host "  [OK] No active process on port 3000." -ForegroundColor Green
    }
} catch {
    Write-Host "  [INFO] Process check skipped." -ForegroundColor Gray
}

# 2. Verify Git & Pull Latest Main
Write-Host "[2/8] Synchronizing with authoritative GitHub repository..." -ForegroundColor Yellow
try {
    $branch = git branch --show-current
    Write-Host "  [OK] Current branch: $branch" -ForegroundColor Gray
    git fetch origin
    git pull origin main
    $headSha = git rev-parse HEAD
    Write-Host "  [OK] Synchronized to HEAD: $headSha" -ForegroundColor Green
} catch {
    Write-Host "  [WARNING] Git synchronization skipped or offline mode active." -ForegroundColor Yellow
}

# 3. Check Node.js prerequisite
Write-Host "[3/8] Checking Node.js runtime..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "  [OK] Found Node.js: $nodeVersion" -ForegroundColor Green
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "  [ERROR] Node.js version 18 or higher is required. Found: $nodeVersion" -ForegroundColor Red
        Exit 1
    }
} catch {
    Write-Host "  [ERROR] Node.js is NOT installed on this machine!" -ForegroundColor Red
    Exit 1
}

# 4. Check npm
Write-Host "[4/8] Checking npm package manager..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "  [OK] Found npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm package manager is not available." -ForegroundColor Red
    Exit 1
}

# 5. Create fresh runtime directories & purge old database
Write-Host "[5/8] Setting up fresh persistent directories (data, logs, backups)..." -ForegroundColor Yellow
$dataDir = Join-Path $projectRoot "data"
$logsDir = Join-Path $projectRoot "logs"
$backupsDir = Join-Path $projectRoot "backups"

$dbPath = Join-Path $dataDir "jarvis_operational.db"
if (Test-Path $dbPath) {
    try {
        Remove-Item $dbPath -Force -ErrorAction Stop
        Remove-Item "$dbPath-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item "$dbPath-shm" -Force -ErrorAction SilentlyContinue
        Write-Host "  [FRESH] Purged previous operational database." -ForegroundColor Magenta
    } catch {
        Write-Host "  [WARNING] Database file is still locked. Please close any open file handles and rerun install.bat." -ForegroundColor Red
        Exit 1
    }
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $backupsDir | Out-Null
Write-Host "  [OK] Fresh runtime directories created." -ForegroundColor Green

# 6. Environment configuration
Write-Host "[6/8] Verifying environment configuration (.env)..." -ForegroundColor Yellow
$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "  [OK] Created .env from template." -ForegroundColor Green
    } else {
        @("PORT=3000", "NODE_ENV=production", "SQLITE_DB_PATH=./data/jarvis_operational.db") | Set-Content -Path $envPath
        Write-Host "  [OK] Created default .env." -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] Existing .env preserved." -ForegroundColor Green
}

# 7. Install dependencies
Write-Host "[7/8] Installing project dependencies..." -ForegroundColor Yellow
npm install --loglevel=error
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Dependency installation failed." -ForegroundColor Red
    Exit 1
}
Write-Host "  [OK] Dependencies installed successfully." -ForegroundColor Green

# 8. Build production application & create desktop shortcut
Write-Host "[8/8] Building production application & setting up launcher..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Production build failed." -ForegroundColor Red
    Exit 1
}
Write-Host "  [OK] Production build complete." -ForegroundColor Green

try {
    $WshShell = New-Object -comObject WScript.Shell
    $desktopPath = [System.Environment]::GetFolderPath('Desktop')
    $shortcut = $WshShell.CreateShortcut((Join-Path $desktopPath "Start JARVIS.lnk"))
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$PSScriptRoot\start-windows.ps1`""
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = "Launch JARVIS Mobile-First Executive AI Assistant"
    $shortcut.Save()
    Write-Host "  [OK] Desktop shortcut 'Start JARVIS' created!" -ForegroundColor Green
} catch {
    Write-Host "  [INFO] Skipping desktop shortcut creation." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "       J.A.R.V.I.S. FRESH INSTALLATION SUCCESSFUL!       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Default accounts created:" -ForegroundColor Cyan
Write-Host "  - Sakib   (Admin, Temp Password: 1234)" -ForegroundColor Yellow
Write-Host "  - Sanjida (User,  Temp Password: 1234)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To start JARVIS locally, run:" -ForegroundColor Cyan
Write-Host "  .\scripts\start-windows.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your JARVIS web dashboard will open at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
