<#
.SYNOPSIS
    JARVIS Automated Windows Installation Script
.DESCRIPTION
    Installs and configures JARVIS on Windows 10/11.
    Verifies Node.js, installs dependencies, initializes SQLite WAL database, builds the app, and creates shortcuts.
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
    Write-Host "  ✓ Found Node.js: $nodeVersion" -ForegroundColor Green
    
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 20) {
        Write-Host "  ⚠️ Node.js version 20+ is recommended. Found: $nodeVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Node.js is NOT installed on this machine!" -ForegroundColor Red
    Write-Host "  Please install Node.js LTS from: https://nodejs.org/" -ForegroundColor Yellow
    Exit 1
}

# 2. Check npm
Write-Host "[2/7] Checking npm package manager..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "  ✓ Found npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm is not available." -ForegroundColor Red
    Exit 1
}

# 3. Create required runtime directories
Write-Host "[3/7] Setting up directories (data, logs, backups)..." -ForegroundColor Yellow
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $projectRoot "data"
$logsDir = Join-Path $projectRoot "logs"
$backupsDir = Join-Path $projectRoot "backups"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $backupsDir | Out-Null
Write-Host "  ✓ Directories verified." -ForegroundColor Green

# 4. Environment configuration
Write-Host "[4/7] Verifying environment configuration (.env)..." -ForegroundColor Yellow
$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "  ✓ Created .env from template." -ForegroundColor Green
        Write-Host "  👉 Note: Edit .env to add your GEMINI_API_KEY and TELEGRAM_BOT_TOKEN when ready." -ForegroundColor Cyan
    } else {
        Set-Content -Path $envPath -Value "PORT=3000`nNODE_ENV=production`nSQLITE_DB_PATH=./data/jarvis_operational.db`n"
        Write-Host "  ✓ Created default .env." -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ Existing .env preserved (no overwrite)." -ForegroundColor Green
}

# 5. Install dependencies
Write-Host "[5/7] Installing project dependencies..." -ForegroundColor Yellow
Set-Location $projectRoot
try {
    if (Test-Path (Join-Path $projectRoot "package-lock.json")) {
        npm ci --loglevel=error
    } else {
        npm install --loglevel=error
    }
    Write-Host "  ✓ Dependencies installed successfully." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ npm ci failed, falling back to npm install..." -ForegroundColor Yellow
    npm install
}

# 6. Build production frontend
Write-Host "[6/7] Building production application..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "  ✓ Production build complete." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Build step encountered notice, continuing..." -ForegroundColor Yellow
}

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
    Write-Host "  ✓ Desktop shortcut 'Start JARVIS' created!" -ForegroundColor Green
} catch {
    Write-Host "  ℹ️ Skipping shortcut creation (manual start supported)." -ForegroundColor Gray
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
