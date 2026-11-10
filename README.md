# J.A.R.V.I.S. — Autonomous Executive AI Partner
### TRISUTRO Virtual CEO & Multi-Agent Operating System

**Authoritative Repository:** https://github.com/sakibtrisutro/jarves.git  
**Version:** 2.0.0 (Voice Intelligence, Telegram Gateway & Live Diagnostics)  
**Development Hub:** Google AI Studio  
**Production Runtime:** Windows 10/11 Laptop / PC  

---

## 🌟 Overview

JARVIS is a persistent executive AI partner and multi-agent operating system designed to manage business workflows, conduct research, execute code, and communicate naturally via voice and Telegram.

### Key Capabilities
- 🎙️ **Full Voice Intelligence:** Real-time microphone Speech-to-Text (Bangla & English), natural AI speech synthesis, Push-to-Talk, and Barge-In conversation interruption.
- 📱 **Telegram Remote Gateway:** 24/7 mobile access via Telegram bot (`/status`, `/task`, `/report`, `/logs`, `/voice`), 1-tap inline approvals, and whitelisted user security.
- 🩺 **Live System Logs & Diagnostics Center:** Real-time Server-Sent Events (SSE) telemetry stream, sub-system health monitors, error correlation, stack traces, and automated troubleshooting guidance.
- ⚙️ **Centralized Settings Menu:** Manage AI providers (Gemini, Groq, OpenRouter, Ollama), Voice options, Telegram tokens, and local runtime parameters.
- 💾 **Tri-Layer Hybrid Memory:** Version-controlled Markdown docs (Git) + high-velocity ACID SQLite database (`data/jarvis_operational.db`) in WAL mode.
- 🪟 **Portable One-Click Windows Deployment:** Ready-to-run PowerShell installer (`install-windows.ps1`), background service launcher, automated backup scripts, and desktop shortcut creator.

---

## 🚀 One-Click Windows Installation

### Step 1: Download & Extract
Download the JARVIS ZIP release or clone the repository to your Windows PC:
```powershell
git clone https://github.com/sakibtrisutro/jarves.git
cd jarves
```

### Step 2: Run the Automated Installer
Right-click `scripts\install-windows.ps1` and select **Run with PowerShell**, or in terminal:
```powershell
.\scripts\install-windows.ps1
```
The installer automatically:
1. Detects Node.js 20+ and npm.
2. Creates required runtime directories (`data/`, `logs/`, `backups/`).
3. Generates your local `.env` configuration file safely without overwriting existing secrets.
4. Installs all project dependencies.
5. Builds the production client.
6. Creates a **"Start JARVIS"** shortcut on your Windows Desktop!

---

## 🕹️ Starting & Managing JARVIS on Windows

- **Start JARVIS:**
  ```powershell
  .\scripts\start-windows.ps1
  ```
  *(Or double-click the **Start JARVIS** desktop shortcut. Your browser opens to `http://localhost:3000`)*

- **Stop JARVIS:**
  ```powershell
  .\scripts\stop-windows.ps1
  ```

- **Run Diagnostics Health Check:**
  ```powershell
  .\scripts\health-check.ps1
  ```

- **Update JARVIS (Preserving your settings and SQLite database):**
  ```powershell
  .\scripts\update-windows.ps1
  ```

- **Create a Manual Database Backup:**
  ```powershell
  .\scripts\backup-windows.ps1
  ```

---

## 🔧 Environment Configuration (`.env`)

```ini
# Core Configuration
PORT=3000
NODE_ENV=production
SQLITE_DB_PATH=./data/jarvis_operational.db

# AI Provider Credentials (Google Gemini)
GEMINI_API_KEY="your_gemini_api_key_here"

# Telegram Bot Interface
TELEGRAM_BOT_TOKEN="your_telegram_bot_token_here"
ALLOWED_TELEGRAM_USER_IDS="your_telegram_numeric_id"
```

---

## 🧪 Automated Verification Suite

To run all automated verification tests:
```bash
npm test
```
All 14 tests verify sensitive data redaction, SQLite WAL integrity, Bangla & English voice logic, Telegram security whitelist, and AI connection diagnostics.

---

## 📜 Documentation Directory
- `docs/MASTER_BLUEPRINT.md` — Authoritative Canonical Master Blueprint v2.0
- `docs/SYSTEM_ARCHITECTURE.md` — Topology, SQLite schemas, event bus
- `docs/DEVELOPMENT_ROADMAP.md` — Phased roadmap (Phases 0–10)
- `docs/AI_PROVIDER_STRATEGY.md` — Multi-provider routing, fallback chains
- `docs/SECURITY_POLICY.md` — Two-tier autonomy matrix & approval gates
- `docs/AGENT_SPECIFICATION.md` — Contracts for 10 specialized agents
- `docs/TELEGRAM_GATEWAY.md` — Remote command & approval protocols
- `docs/RUNTIME_DEPLOYMENT.md` — Windows service & PM2 setup
- `docs/KNOWLEDGE_PRESERVATION.md` — Tri-layer hybrid memory protocols
- `docs/DECISIONS.md` — Immutable decision log (DEC-001 through DEC-022)
- `docs/PROGRESS.md` — Phased progress tracker
