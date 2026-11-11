<#
.SYNOPSIS
    JARVIS Automated Windows Installation Script
.DESCRIPTION
    Installs and configures JARVIS on Windows 10/11.
    Verifies Node.js 18+, installs dependencies, initializes SQLite WAL database, builds the production app, and creates desktop shortcuts.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       J.A.R.V.I.S. AUTOMATED WINDOWS INSTALLER           " -ForegroundColor Cyan
Write-Host "    TRISUTRO Virtual CEO & Autonomous Executive AI        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js prerequisite
Write-Host "[1/7] Checking Node.js runtime..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "  [OK] Found Node.js: $nodeVersion" -ForegroundColor Green
    
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "  [ERROR] Node.js version 18 or higher is required. Found: $nodeVersion" -ForegroundColor Red
        Write-Host "  Please download and install Node.js LTS from: https://nodejs.org/" -ForegroundColor Yellow
        Exit 1
    }
} catch {
    Write-Host "  [ERROR] Node.js is NOT installed on this machine!" -ForegroundColor Red
    Write-Host "  Please download and install Node.js 20+ LTS from: https://nodejs.org/" -ForegroundColor Yellow
    Exit 1
}

# 2. Check npm
Write-Host "[2/7] Checking npm package manager..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "  [OK] Found npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm package manager is not available." -ForegroundColor Red
    Exit 1
}

# 3. Create required runtime directories
Write-Host "[3/7] Setting up persistent directories (data, logs, backups)..." -ForegroundColor Yellow
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $projectRoot "data"
$logsDir = Join-Path $projectRoot "logs"
$backupsDir = Join-Path $projectRoot "backups"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $backupsDir | Out-Null
Write-Host "  [OK] Directories verified." -ForegroundColor Green

# 4. Environment configuration
Write-Host "[4/7] Verifying environment configuration (.env)..." -ForegroundColor Yellow
$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "  [OK] Created .env from template." -ForegroundColor Green
        Write-Host "  [INFO] Note: Open Settings in the web app to save your API key when ready." -ForegroundColor Cyan
    } else {
        @("PORT=3000", "NODE_ENV=production", "SQLITE_DB_PATH=./data/jarvis_operational.db") | Set-Content -Path $envPath
        Write-Host "  [OK] Created default .env." -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] Existing .env preserved (no overwrite)." -ForegroundColor Green
}

# 5. Install dependencies
Write-Host "[5/7] Installing project dependencies..." -ForegroundColor Yellow
Set-Location $projectRoot
$installSuccess = $false

if (Test-Path (Join-Path $projectRoot "package-lock.json")) {
    Write-Host "  Running 'npm ci'..." -ForegroundColor Gray
    npm ci --loglevel=error
    if ($LASTEXITCODE -eq 0) {
        $installSuccess = $true
    } else {
        Write-Host "  [WARNING] 'npm ci' failed. Retrying with 'npm install'..." -ForegroundColor Yellow
    }
}

if (-not $installSuccess) {
    Write-Host "  Running 'npm install'..." -ForegroundColor Gray
    npm install --loglevel=error
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] npm dependency installation failed with exit code $LASTEXITCODE." -ForegroundColor Red
        Write-Host "  Installation aborted." -ForegroundColor Red
        Exit 1
    }
}
Write-Host "  [OK] Dependencies installed successfully." -ForegroundColor Green

# 6. Build production application
Write-Host "[6/7] Building production application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Production build failed with exit code $LASTEXITCODE." -ForegroundColor Red
    Write-Host "  Installation aborted." -ForegroundColor Red
    Exit 1
}
Write-Host "  [OK] Production build complete." -ForegroundColor Green

# 7. Create Windows Desktop Shortcut (Optional)
Write-Host "[7/7] Creating Desktop launcher shortcut..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -comObject WScript.Shell
    $desktopPath = [System.Environment]::GetFolderPath('Desktop')
    $shortcut = $WshShell.CreateShortcut((Join-Path $desktopPath "Start JARVIS.lnk"))
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$PSScriptRoot\start-windows.ps1`""
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = "Launch JARVIS Autonomous AI Assistant"
    $shortcut.Save()
    Write-Host "  [OK] Desktop shortcut 'Start JARVIS' created!" -ForegroundColor Green
} catch {
    Write-Host "  [INFO] Skipping desktop shortcut creation." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "       J.A.R.V.I.S. INSTALLATION COMPLETE!               " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start JARVIS locally, run:" -ForegroundColor Cyan
Write-Host "  .\scripts\start-windows.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or double-click the 'Start JARVIS' shortcut on your Desktop." -ForegroundColor Cyan
Write-Host "Your JARVIS web dashboard will open at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
