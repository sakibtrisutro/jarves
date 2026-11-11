# JARVIS — Windows Deployment & Troubleshooting Guide

Common issues and resolution steps for Windows installations.

## 1. Port 3000 Already in Use
- Run `stop.bat` to clear running JARVIS processes.
- Or check process usage:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000
  ```

## 2. API Provider Not Configured
- Symptom: Header shows `AI PROVIDER: NOT CONFIGURED`.
- Fix: Open Settings -> API Keys & Providers, enter your API key, and click Save.

## 3. Node.js Not Found
- Download and install Node.js 20+ LTS from [https://nodejs.org/](https://nodejs.org/).
- Ensure "Add to PATH" is checked during Node installation.
