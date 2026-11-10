@echo off
title JARVIS Launcher
echo Launching JARVIS Executive AI Operating System...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start JARVIS server or health check timed out.
    pause
    exit /b %ERRORLEVEL%
)
