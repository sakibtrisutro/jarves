# JARVIS — Backup & Restoration Guide

JARVIS stores operational state in a single persistent SQLite WAL database located at `./data/jarvis_operational.db`.

## Creating a Database Backup
Double-click `backup.bat` in the project root or execute in PowerShell:
```cmd
.\backup.bat
```
Backups are saved with timestamped filenames in `./backups/` (e.g., `./backups/jarvis_backup_2026-11-10_134500.db`).

## Restoring a Database Backup
Double-click `restore.bat` in the project root or execute in PowerShell:
```cmd
.\restore.bat
```
`restore.bat` will find the latest snapshot in `./backups/` and restore it to `./data/jarvis_operational.db`.
