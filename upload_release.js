import fs from 'fs';
import path from 'path';

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error("Please set GITHUB_TOKEN environment variable.");
    process.exit(1);
}
const repo = "YoTeAyudoESP/pcshogar.github.io";
const version = "v1.7.3";

async function uploadRelease() {
    console.log("Creating release...");
    const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tag_name: version,
            name: `PCSHogar ${version}`,
            body: "Novedades v1.7.3:\n- 📁 Creación de carpetas directamente en Google Drive y Dropbox.\n- 🌍 Traducción al inglés de los menús y la configuración.\n- 💵 Mejoras en el sistema multimoneda y conversión automática.\n- 🎨 Mejoras visuales en el tema claro y oscuro.",
            draft: false,
            prerelease: false
        })
    });
    
    let releaseData = await releaseRes.json();
    if (!releaseRes.ok) {
        console.error("Error creating release:", releaseData);
        console.log("Attempting to fetch existing release...");
        const existingRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${version}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        releaseData = await existingRes.json();
        if (!existingRes.ok) {
            console.error("Failed to fetch existing release:", releaseData);
            return;
        }
    }

    const uploadUrl = releaseData.upload_url.replace(/\{.*\}$/, '');
    console.log("Upload URL:", uploadUrl);

    // Upload APK
    const apkPath = "dist_android/PCSHogar_Setup_v1.7.3.apk";
    console.log("Uploading APK...");
    const apkBuffer = fs.readFileSync(apkPath);
    const apkRes = await fetch(`${uploadUrl}?name=PCSHogar_Setup_v1.7.3.apk`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/vnd.android.package-archive"
        },
        body: apkBuffer
    });
    console.log("APK uploaded:", apkRes.ok, await apkRes.text());

    // Upload EXE
    let exePath = "dist_electron/PCSHogar Setup 1.7.3.exe";
    if (!fs.existsSync(exePath)) {
        exePath = "dist_electron/PCSHogar_Setup_v1.7.3.exe";
    }
    console.log(`Uploading EXE from ${exePath}...`);
    const exeBuffer = fs.readFileSync(exePath);
    const exeRes = await fetch(`${uploadUrl}?name=PCSHogar_Setup_v1.7.3.exe`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/x-msdownload"
        },
        body: exeBuffer
    });
    console.log("EXE uploaded:", exeRes.ok, await exeRes.text());
    
    console.log("Done!");
}

uploadRelease().catch(console.error);
