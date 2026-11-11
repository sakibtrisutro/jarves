@echo off
title Stop JARVIS Server
color 0C
cls

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop-windows.ps1"

pause
