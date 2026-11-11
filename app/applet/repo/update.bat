@echo off
title Update JARVIS Release
color 0B
cls

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\update-windows.ps1"

pause
