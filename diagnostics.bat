@echo off
title JARVIS Diagnostics
echo Running System Diagnostics & Health Check...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\health-check.ps1"
pause
