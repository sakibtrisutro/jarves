<#
.SYNOPSIS
    Runs diagnostic health-check against running JARVIS instance
#>

Write-Host "Pinging JARVIS health endpoint..." -ForegroundColor Cyan

try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5
    Write-Host "  [OK] System Status: $($resp.status)" -ForegroundColor Green
    Write-Host "    - Backend: $($resp.subsystems.backend)" -ForegroundColor Gray
    Write-Host "    - Database: $($resp.subsystems.database)" -ForegroundColor Gray
    Write-Host "    - AI Provider: $($resp.subsystems.ai_provider)" -ForegroundColor Gray
    Write-Host "    - Active Agents: $($resp.subsystems.active_agents)" -ForegroundColor Gray
    Write-Host "    - Total Diagnostics: $($resp.subsystems.total_diagnostic_events)" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Health check failed. Is JARVIS running on port 3000?" -ForegroundColor Red
    Exit 1
}
