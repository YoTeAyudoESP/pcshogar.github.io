$package = Get-Content -Raw -Path package.json | ConvertFrom-Json
$version = $package.version
Write-Output "Parsed version: $version"

git checkout main
git fetch origin main
# Removed git reset --hard origin/main to prevent losing local uncommitted work
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
git checkout source
