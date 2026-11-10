@echo off
title JARVIS Installer
echo Running JARVIS Windows Installation...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"
pause
