import fs from 'fs';
import path from 'path';

const token = "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";
const repo = "YoTeAyudoESP/pcshogar.github.io";
const version = "v1.6.7";

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
            body: "Novedades v1.6.7:\n- 🚀 Motor Dinámico de Desajustes: La app ahora calcula tu deuda real en tiempo real revisando cada transacción de tarjeta, en lugar de fiarse de saldos estáticos que puedan fallar.\n- 🛠 Auto-Reparación Inteligente: Al actualizar la app, todos los saldos de tus tarjetas se repararán automáticamente si existía algún desajuste por un borrado o error pasado.",
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
    const apkPath = "dist_android/PCSHogar_Setup_v1.6.7.apk";
    console.log("Uploading APK...");
    const apkBuffer = fs.readFileSync(apkPath);
    const apkRes = await fetch(`${uploadUrl}?name=PCSHogar_Setup_v1.6.7.apk`, {
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
    let exePath = "dist_electron/PCSHogar Setup 1.6.7.exe";
    if (!fs.existsSync(exePath)) {
        exePath = "dist_electron/PCSHogar_Setup_v1.6.7.exe";
    }
    console.log("Uploading EXE from " + exePath + "...");
    const exeBuffer = fs.readFileSync(exePath);
    const exeRes = await fetch(`${uploadUrl}?name=PCSHogar_Setup_v1.6.7.exe`, {
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
