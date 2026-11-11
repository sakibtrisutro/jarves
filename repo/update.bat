@echo off
title JARVIS Updater
echo Updating JARVIS from repository...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\update-windows.ps1"
pause
