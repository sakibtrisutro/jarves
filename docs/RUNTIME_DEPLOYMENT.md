# Windows PC Runtime & Deployment Guide

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## 1. RUNTIME PHILOSOPHY

While Google AI Studio serves as the primary development and planning station, the permanent production home of JARVIS is the **owner's Windows PC**.

Running directly on Windows grants JARVIS:
1. **True 24/7 Background Persistence:** Continuous task execution, scheduled cron jobs, and uninterrupted Telegram polling.
2. **Local Relational Performance:** Sub-millisecond SQLite disk I/O with zero cloud database subscription fees.
3. **Local AI Capability:** Direct integration with local Ollama hardware acceleration (GPU/CPU) for offline resilience.
4. **Data Sovereignty:** Private customer and business data stays securely on the owner's local machine.

---

## 2. HOST PREREQUISITES

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Windows 10 (64-bit, 20H2+) | Windows 11 (64-bit) |
| **Node.js** | v20.x LTS | v22.x LTS |
| **Package Manager** | npm v10.x | npm v10.x |
| **Version Control** | Git for Windows (2.40+) | Git with Credential Manager |
| **Database** | SQLite 3.40+ (Built-in via `better-sqlite3`) | Same |
| **Local AI (Optional)**| Ollama v0.3+ | Ollama with CUDA acceleration |

---

## 3. INSTALLATION & SETUP WORKFLOW

### Step 1: Clone the Authoritative Repository
Open PowerShell or Windows Terminal:
```powershell
cd C:\Users\Sakib\Projects
git clone https://github.com/sakibtrisutro/jarves.git
cd jarves
```

### Step 2: Install Node.js Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Create a local `.env` file in the root directory (never commit this file):
```ini
# Core Configuration
NODE_ENV=production
PORT=3000

# Google AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# Groq Cloud (Free Tier)
GROQ_API_KEY=your_groq_api_key_here

# Telegram Bot Interface
TELEGRAM_BOT_TOKEN=your_bot_token_here
ALLOWED_TELEGRAM_USER_IDS=your_telegram_numeric_id

# Storage Paths
SQLITE_DB_PATH=./data/jarvis_operational.db
```

### Step 4: Initialize SQLite Operational Database
```powershell
npm run db:migrate
```

---

## 4. PERSISTENT BACKGROUND SERVICE CONFIGURATION

To ensure JARVIS starts automatically when the Windows PC turns on and restarts automatically if an exception occurs, choose one of the following production managers:

### Option A: PM2 Process Manager (Recommended)
1. Install PM2 globally:
   ```powershell
   npm install -g pm2 pm2-windows-startup
   ```
2. Configure Windows startup hook:
   ```powershell
   pm2-startup install
   ```
3. Launch JARVIS daemon:
   ```powershell
   pm2 start npm --name "jarvis-daemon" -- run start
   pm2 save
   ```

### Option B: Native Windows Service (via NSSM)
1. Download NSSM (Non-Sucking Service Manager).
2. Install as a service:
   ```powershell
   nssm install JARVIS "C:\Program Files\nodejs\npm.cmd" "run start"
   nssm set JARVIS AppDirectory "C:\Users\Sakib\Projects\jarves"
   nssm set JARVIS AppStdout "C:\Users\Sakib\Projects\jarves\logs\service_stdout.log"
   nssm set JARVIS AppStderr "C:\Users\Sakib\Projects\jarves\logs\service_stderr.log"
   nssm start JARVIS
   ```

---

## 5. DATABASE MAINTENANCE & BACKUP PROTOCOL

### Automated Hourly Checkpoint
The SQLite connection is configured with Write-Ahead Logging (WAL) and auto-checkpointing:
```typescript
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('wal_autocheckpoint = 1000');
```

### Scheduled Daily Backup Script (`scripts/backup_db.bat`)
A Windows Task Scheduler task runs daily at 03:00 AM:
```batch
@echo off
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%
copy C:\Users\Sakib\Projects\jarves\data\jarvis_operational.db C:\Users\Sakib\Projects\jarves\data\backups\jarvis_%TIMESTAMP%.db
```

---

## 6. LOGGING & HEALTH MONITORING

- **Application Logs:** Streamed to `logs/jarvis.log` with automatic log rotation (max 20MB per file, 5 rotated backups retained).
- **Health Check Endpoint:** `http://localhost:3000/api/health` returns `{"status": "healthy", "uptime_seconds": 86400, "active_tasks": 2}`.
- **Watchdog:** If the process crashes, PM2 or NSSM restarts it within 2 seconds. The startup sequence loads the latest checkpoint from SQLite and resumes any in-flight tasks.
