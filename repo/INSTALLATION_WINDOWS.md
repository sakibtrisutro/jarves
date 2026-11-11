# INSTALLATION & WINDOWS RUNTIME GUIDE

This document explains how to install, configure, start, stop, back up, and run JARVIS independently on your Windows 10/11 laptop.

---

## 1. System Prerequisites
- **Node.js:** v20.x or v22.x LTS (Download from nodejs.org)
- **npm:** Bundled with Node.js
- **Windows PowerShell 5.1+**

---

## 2. Fresh Installation Steps
1. Extract the JARVIS portable ZIP archive anywhere on your laptop.
2. Open PowerShell in the project root.
3. Run the installer:
   ```powershell
   .\scripts\install-windows.ps1
   ```
4. This verifies Node.js, installs all dependencies (`package-lock.json`), builds production assets, initializes SQLite WAL database (`data/jarvis_operational.db`), and creates a Desktop shortcut.

---

## 3. Starting the Server & LAN Access
Start the server:
```powershell
.\scripts\start-windows.ps1
```
JARVIS runs locally at `http://localhost:3000`. To access JARVIS from your phone over your home Wi-Fi network, use your laptop's local LAN IP address (e.g. `http://192.168.1.50:3000`).

---

## 4. Backups and Database Safety
Your user data and memories are stored safely in SQLite WAL. To create a timestamped backup:
```powershell
.\scripts\backup-windows.ps1
```
Backups are saved in the `backups/` directory. Normal updates never overwrite your user data or SQLite database.
