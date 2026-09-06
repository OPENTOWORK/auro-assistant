# Configura .env.local para el proyecto Supabase "Auro asistente personal"
param(
  [string]$Url,
  [string]$Anon,
  [string]$Service
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"

Write-Host ""
Write-Host "=== Conectar Auro con Supabase ===" -ForegroundColor Cyan
Write-Host "Proyecto: Auro asistente personal"
Write-Host "Obtén la URL en: Supabase Dashboard -> Settings -> API -> Project URL"
Write-Host ""

if (-not $Url) {
  $Url = Read-Host "NEXT_PUBLIC_SUPABASE_URL (https://xxx.supabase.co)"
}
if (-not $Anon) {
  $Anon = Read-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY"
}
if (-not $Service) {
  $Service = Read-Host "SUPABASE_SERVICE_ROLE_KEY"
}

$anon = $Anon
$service = $Service

$content = @"
# Supabase — Auro asistente personal
NEXT_PUBLIC_SUPABASE_URL=$url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service

# OpenAI (opcional)
OPENAI_API_KEY=

# Webhooks n8n (opcional)
N8N_WEBHOOK_SECRET=
"@

Set-Content -Path $envFile -Value $content -Encoding UTF8
Write-Host ""
Write-Host "Archivo .env.local creado." -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso: ejecuta supabase/schema.sql en SQL Editor de tu proyecto."
Write-Host "Luego reinicia: npm run dev"
Write-Host "Prueba conexion: http://localhost:3000/api/health/supabase"
Write-Host ""
