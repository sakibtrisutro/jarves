@echo off
title JARVIS Restart
echo Restarting JARVIS...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop-windows.ps1"
timeout /t 2 /nobreak >nul
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"
