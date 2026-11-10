@echo off
title JARVIS Backup
echo Creating Database Backup...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\backup-windows.ps1"
pause
