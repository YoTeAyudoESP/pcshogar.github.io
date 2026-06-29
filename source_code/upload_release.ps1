$token = "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"
$repo = "YoTeAyudoESP/pcshogar.github.io"
$version = "v1.6.7"
$apkPath = "dist_android\PCSHogar_Setup_v1.6.7.apk"
$exePath = "dist_electron\PCSHogar Setup 1.6.7.exe"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# 1. Create Release
$releaseBody = @{
    "tag_name" = $version
    "name" = "PCSHogar $version"
    "body" = "Novedades v1.6.7:`n- 🚀 Motor Dinámico de Desajustes: La app ahora calcula tu deuda real en tiempo real revisando cada transacción de tarjeta, en lugar de fiarse de saldos estáticos que puedan fallar.`n- 🛠 Auto-Reparación Inteligente: Al actualizar la app, todos los saldos de tus tarjetas se repararán automáticamente si existía algún desajuste por un borrado o error pasado."
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
$apkName = "PCSHogar_Setup_v1.6.7.apk"
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
$exeName = "PCSHogar_Setup_v1.6.7.exe"
$exeUploadUrl = "$uploadUrl?name=$exeName"
$exeHeaders = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Content-Type" = "application/x-msdownload"
}
Invoke-RestMethod -Uri $exeUploadUrl -Method Post -Headers $exeHeaders -InFile $exePath

Write-Output "Release and assets uploaded successfully!"
