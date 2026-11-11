@echo off
title Start JARVIS Executive Assistant
color 0B
cls

echo ==========================================================
echo           STARTING J.A.R.V.I.S. LOCAL SERVER
echo ==========================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"

pause
