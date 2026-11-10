@echo off
title JARVIS Uninstaller
echo Cleaning up JARVIS environment...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-windows.ps1"
pause
