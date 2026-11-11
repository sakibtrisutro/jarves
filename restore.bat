@echo off
title JARVIS Restore
echo Restoring Database Backup...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\restore-windows.ps1"
pause
