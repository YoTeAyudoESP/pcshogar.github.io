$token = $env:GITHUB_TOKEN
$repo = "YoTeAyudoESP/pcshogar.github.io"
$version = "v1.7.3"
$apkPath = "dist_android\PCSHogar_Setup_v1.7.3.apk"
$exePath = "dist_electron\PCSHogar Setup 1.7.3.exe"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# 1. Create Release
$releaseBody = @{
    "tag_name" = $version
    "name" = "PCSHogar $version"
    "body" = "Novedades v1.7.3:`n- 📁 Creación de carpetas directamente en Google Drive y Dropbox.`n- 🌍 Traducción al inglés de los menús y la configuración.`n- 💵 Mejoras en el sistema multimoneda y conversión automática.`n- 🎨 Mejoras visuales en el tema claro y oscuro."
    "draft" = $false
    "prerelease" = $false
} | ConvertTo-Json -Depth 10

Write-Output "Creating release $version..."
try {
    $releaseResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Method Post -Headers $headers -Body $releaseBody -ErrorAction Stop
} catch {
    Write-Output "Error creating release:"
    Write-Output $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $reader.ReadToEnd()
    
    Write-Output "Fetching existing release..."
    $releaseResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$version" -Method Get -Headers $headers
}

$uploadUrl = $releaseResponse.upload_url -replace '\{.*\}', ''
Write-Output "Upload URL: $uploadUrl"

# 2. Upload APK
Write-Output "Uploading APK..."
$apkName = "PCSHogar_Setup_v1.7.3.apk"
$apkUploadUrl = "$uploadUrl?name=$apkName"
$apkHeaders = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Content-Type" = "application/vnd.android.package-archive"
}
Invoke-RestMethod -Uri $apkUploadUrl -Method Post -Headers $apkHeaders -InFile $apkPath

# 3. Upload EXE
Write-Output "Uploading EXE from $exePath ..."
$exeName = "PCSHogar_Setup_v1.7.3.exe"
$exeUploadUrl = "$uploadUrl?name=$exeName"
$exeHeaders = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Content-Type" = "application/x-msdownload"
}
Invoke-RestMethod -Uri $exeUploadUrl -Method Post -Headers $exeHeaders -InFile $exePath

Write-Output "Release and assets uploaded successfully!"
