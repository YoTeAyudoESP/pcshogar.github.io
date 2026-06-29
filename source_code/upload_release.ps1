$token = $env:GITHUB_TOKEN
$repo = "YoTeAyudoESP/pcshogar.github.io"
$version = "v1.7.0"
$apkPath = "dist_android\PCSHogar_Setup_v1.7.0.apk"
$exePath = "dist_electron\PCSHogar Setup 1.7.0.exe"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# 1. Create Release
$releaseBody = @{
    "tag_name" = $version
    "name" = "PCSHogar $version"
    "body" = "Novedades v1.7.0:`n- 🚀 Alerta de desajustes mejorada (incluye gastos fijos pendientes).`n- 💳 Cálculo de deuda acumulada de tarjetas de crédito optimizado.`n- 🛠 Opción de ocultar alerta de desajustes (3 días o hasta próximo mes)."
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
$apkName = "PCSHogar_Setup_v1.7.0.apk"
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
$exeName = "PCSHogar_Setup_v1.7.0.exe"
$exeUploadUrl = "$uploadUrl?name=$exeName"
$exeHeaders = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Content-Type" = "application/x-msdownload"
}
Invoke-RestMethod -Uri $exeUploadUrl -Method Post -Headers $exeHeaders -InFile $exePath

Write-Output "Release and assets uploaded successfully!"
