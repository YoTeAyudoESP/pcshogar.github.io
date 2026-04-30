# Migration Helper for PCS Home
# This script copies the current project to a destination folder of your choice.

$SourcePath = "c:\Users\pablo\Documents\Proyecto Antigravity\.gemini\antigravity\scratch\domestic-economy-app"
$DestinationPath = Read-Host "Introduce la ruta completa de la carpeta de tu aplicación antigua (donde quieres mover PCS Home)"

if (-not (Test-Path $DestinationPath)) {
    Write-Host "La ruta de destino no existe." -ForegroundColor Red
    exit
}

Write-Host "Iniciando copia de $SourcePath a $DestinationPath..." -ForegroundColor Cyan

# Backup optional
$BackupPath = "$DestinationPath`_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "Creando copia de seguridad de la carpeta antigua en $BackupPath..." -ForegroundColor Yellow
Copy-Item -Path $DestinationPath -Destination $BackupPath -Recurse -Force

# Copy files
Copy-Item -Path "$SourcePath\*" -Destination $DestinationPath -Recurse -Force -Exclude "node_modules", ".git"

Write-Host "¡Sustitución completada con éxito!" -ForegroundColor Green
Write-Host "Ahora entra en $DestinationPath y ejecuta 'npm install' para terminar." -ForegroundColor Cyan
