$ErrorActionPreference = "Stop"

$taskName = "AURO Daily Briefing"
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if (-not $existing) {
  Write-Host "No existía la tarea: $taskName"
  exit 0
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "Tarea eliminada: $taskName"
exit 0
