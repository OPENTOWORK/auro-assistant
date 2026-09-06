$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$logDir = Join-Path $repoRoot ".auro-local\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "daily-briefing.log"

function Write-TaskLog {
  param([string]$Message)
  $safe = $Message -replace '(?i)(AURO_CRON_SECRET|Authorization)\s*[:=]\s*\S+', '$1=[redacted]'
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath $logFile -Value "[$stamp] $safe"
}

function Invoke-LoggedNative {
  param(
    [scriptblock]$Command,
    [string]$Label
  )

  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & $Command 2>&1 | ForEach-Object { "$_" } | Out-String
  $code = $LASTEXITCODE
  $ErrorActionPreference = $previous

  if ($output.Trim()) {
    Write-TaskLog ("${Label}: " + $output.Trim())
  }
  Write-TaskLog "$Label exit=$code"
  return $code
}

Write-TaskLog "inicio"

$ensureCode = Invoke-LoggedNative -Label "ensure" -Command {
  node "scripts/ensure-auro-running.mjs"
}
if ($ensureCode -ne 0) {
  exit $ensureCode
}

$briefingCode = Invoke-LoggedNative -Label "briefing" -Command {
  npm run briefing:daily
}
exit $briefingCode
