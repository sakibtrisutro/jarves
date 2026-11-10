<#
.SYNOPSIS
    Gracefully stops JARVIS processes running on Windows
#>

Write-Host "Stopping JARVIS processes..." -ForegroundColor Yellow

try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Terminated JARVIS process (PID: $pidToKill)" -ForegroundColor Green
        }
    } else {
        Write-Host "No active JARVIS server detected on port 3000." -ForegroundColor Gray
    }
} catch {
    Write-Host "Notice during process shutdown: $_" -ForegroundColor Gray
}

Write-Host "JARVIS shutdown complete." -ForegroundColor Green
