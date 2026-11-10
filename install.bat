@echo off
title JARVIS Installer
echo Running JARVIS Windows Installation...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation aborted due to an error. Please check messages above.
    pause
    exit /b %ERRORLEVEL%
)
pause
