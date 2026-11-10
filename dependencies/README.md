# JARVIS Dependency & Installation Guide

This document describes the runtime requirements and installation procedures for deploying JARVIS on your Windows PC / laptop.

---

## 1. Prerequisites (Zero External Setup)

JARVIS uses standard, non-proprietary runtime tools:
- **Node.js (LTS version 20 or 22+):** Download from https://nodejs.org/
- **npm (version 10+):** Bundled with Node.js.
- **Git for Windows (Optional for updates):** https://git-scm.com/
- **Audio Hardware:** Built-in microphone and speakers or USB headset.

---

## 2. One-Click Automated Windows Installation

1. Download or clone this repository to your laptop.
2. Open Windows PowerShell in the project folder.
3. Run the installer:
   ```powershell
   .\scripts\install-windows.ps1
   ```
4. The installer automatically:
   - Verifies Node.js & npm.
   - Creates directories (`data/`, `logs/`, `backups/`).
   - Installs all dependencies.
   - Builds production assets.
   - Generates a **"Start JARVIS"** shortcut on your Desktop.

---

## 3. Running JARVIS Locally

To start:
```powershell
.\scripts\start-windows.ps1
```
Or double-click the desktop shortcut. JARVIS will start the background daemon and launch your browser to `http://localhost:3000`.

To stop:
```powershell
.\scripts\stop-windows.ps1
```

---

## 4. Offline Deployment Support

If deploying in an air-gapped or offline environment:
1. Run `npm install` on an internet-connected machine.
2. Package the folder (excluding secrets).
3. Extract onto the offline laptop; JARVIS will run using local built-in `node:sqlite` and cached browser speech models.
