@echo off
title JARVIS Launcher
echo Launching JARVIS Executive AI Operating System...
set "SCRIPT_PATH=%~dp0scripts\start-windows.ps1"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start JARVIS server or health check timed out.
    echo Please ensure Node.js is installed and port 3000 is available.
    pause
    exit /b %ERRORLEVEL%
)
