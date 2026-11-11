@echo off
title Restart JARVIS Server
color 0E
cls

echo Restarting JARVIS server...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop-windows.ps1"
timeout /t 2 /nobreak >nul
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"

pause
