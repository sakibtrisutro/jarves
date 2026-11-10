# J.A.R.V.I.S. — Autonomous Executive AI Partner
### TRISUTRO Virtual CEO & Autonomous Model Intelligence OS

**Authoritative Repository:** https://github.com/sakibtrisutro/jarves.git  
**Version:** 3.0.0 (Autonomous Model Intelligence Engine, Multi-User Assistants, Voice & Windows Local Production)  
**Development Hub:** Google AI Studio  
**Production Runtime:** Windows 10/11 Laptop / PC  

---

## 🌟 Overview

JARVIS is a persistent, modular executive AI assistant platform. Version 3.0 introduces an independent **Autonomous Model Intelligence Engine** with OpenRouter free-model discovery, strict free-only policy enforcement, multi-user isolation (Sakib & Sanjida), robust microphone voice input/output, and local Windows production deployment.

### Key Features
- 🧠 **Autonomous Model Intelligence Engine:** Dynamic model discovery via OpenRouter catalog, automatic task-based routing (coding, reasoning, multilingual), and strict Free-Only policy enforcement at the backend request level.
- 👥 **Multi-User Personal Assistants:** Isolated accounts for **Sakib** (default male voice personality) and **Sanjida** (default female voice personality) with separate conversations, long-term memories, and preferences.
- 🎙️ **Voice System:** Robust microphone permission handling, Speech-to-Text (Bangla & English), natural voice synthesis, Push-to-Talk, continuous conversation, and instant Stop Speaking (Barge-In).
- 🩺 **Live System Logs & Diagnostics:** Real-time Server-Sent Events (SSE) log stream, sub-system health monitors, and automated actionable troubleshooting guidance.
- 💾 **Tri-Layer Hybrid Memory & SQLite WAL:** Version-controlled Markdown docs (Git) + high-velocity ACID SQLite database (`data/jarvis_operational.db`) in Write-Ahead Logging mode.
- 🪟 **Portable Windows Deployment:** Ready-to-run PowerShell installation scripts (`install.bat`, `start.bat`, `stop.bat`, `update.bat`, `backup.bat`), dependency manifest, and release ZIP packaging.

---

## 🚀 One-Click Windows Installation

### Step 1: Download & Extract
Download the JARVIS release ZIP or clone the repository to your Windows PC:
```powershell
git clone https://github.com/sakibtrisutro/jarves.git
cd jarves
```

### Step 2: Run the Installer
Run `install.bat` or in Windows PowerShell:
```powershell
.\scripts\install-windows.ps1
```
The installer automatically verifies Node.js 20+, creates runtime directories (`data/`, `logs/`, `backups/`), installs dependencies, builds the application, and creates a **"Start JARVIS"** shortcut on your Desktop.

---

## 🕹️ Starting & Managing JARVIS on Windows

- **Start JARVIS:**
  ```powershell
  .\scripts\start-windows.ps1
  ```
- **Stop JARVIS:**
  ```powershell
  .\scripts\stop-windows.ps1
  ```
- **Backup Operational Database:**
  ```powershell
  .\scripts\backup-windows.ps1
  ```

---

## 👥 Default Test Credentials

When you first launch JARVIS, log in with either test account (initial temporary password is `1234`):
- **User 1:** `Sakib` (Password: `1234`, Voice: Male)
- **User 2:** `Sanjida` (Password: `1234`, Voice: Female)
*(You will be prompted to change your temporary password upon first login).*

---

## 🧪 Automated Verification Suite

Run all verification tests:
```bash
npm test
```
