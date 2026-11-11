@echo off
title JARVIS Shutdown
echo Stopping JARVIS process...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop-windows.ps1"
pause
