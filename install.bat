@echo off
title JARVIS Installer
echo Running JARVIS Windows Installation...
set "SCRIPT_PATH=%~dp0scripts\install-windows.ps1"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation aborted due to an error. Please check messages above.
    pause
    exit /b %ERRORLEVEL%
)
pause
