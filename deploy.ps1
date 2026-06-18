$package = Get-Content -Raw -Path package.json | ConvertFrom-Json
$version = $package.version
Write-Output "Parsed version: $version"

# Proteger código fuente: Verificar si hay cambios sin guardar
git diff-index --quiet HEAD --
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error crítico: Tienes cambios sin confirmar en el código. Haz commit de tus cambios antes de desplegar para evitar perderlos."
    exit 1
}

$currentBranch = (git branch --show-current).Trim()

git checkout main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error: No se pudo cambiar a la rama main."
    exit 1
}

git fetch origin main
git reset --hard origin/main
# Clean the app directory, but first check if it exists and is a file. If it's a file, remove it first.
if (Test-Path -Path app -PathType Leaf) {
    Remove-Item -Path app -Force
}
if (-not (Test-Path -Path app)) {
    New-Item -ItemType Directory -Path app -Force
}
Remove-Item -Path app\* -Recurse -Force -Exclude ".*" -ErrorAction SilentlyContinue
Copy-Item -Path dist\* -Destination app -Recurse -Force
Copy-Item -Path dist\version.json -Destination app\version.json -Force
Copy-Item -Path dist\version.json -Destination version.json -Force
Copy-Item -Path "dist_android\PCSHogar_Setup_v$version.apk" -Destination "." -Force
Copy-Item -Path "dist_electron\PCSHogar Setup $version.exe" -Destination ".\PCSHogar_Setup_v$version.exe" -Force
git add app
git add version.json
git add "PCSHogar_Setup_v$version.apk"
git add "PCSHogar_Setup_v$version.exe"
git commit -m "Deploy v$version"
git push origin main
git checkout $currentBranch
