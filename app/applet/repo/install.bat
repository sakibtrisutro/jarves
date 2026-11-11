@echo off
title JARVIS Automated Windows Installer
color 0A
cls

echo ==========================================================
echo        J.A.R.V.I.S. AUTOMATED WINDOWS INSTALLER
echo     TRISUTRO Virtual CEO ^& Autonomous Executive AI
echo ==========================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"

echo.
pause
