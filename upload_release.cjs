const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'YoTeAyudoESP';
const REPO = 'pcshogar.github.io';
const TAG = 'v1.8.8';
const RELEASE_NAME = 'PCS Hogar v1.8.8';
const RELEASE_BODY = '🚀 Novedades v1.8.8:\n- Añadida la funcionalidad para editar y eliminar gastos e ingresos pendientes directamente desde la tarjeta principal.\n- Mejoras en la interfaz de usuario.\n- Correcciones menores.';

function request(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'NodeJS',
                'Accept': 'application/vnd.github.v3+json',
                ...headers
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch(e) {
                    resolve(body);
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            if (Buffer.isBuffer(data)) {
                req.write(data);
            } else {
                req.write(JSON.stringify(data));
            }
        }
        req.end();
    });
}

async function uploadAsset(uploadUrl, filePath, name, mimeType = 'application/octet-stream') {
    console.log(`Uploading ${name}...`);
    const data = fs.readFileSync(filePath);
    const url = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(name)}`);
    
    const res = await request('POST', url, data, {
        'Content-Type': mimeType,
        'Content-Length': data.length
    });
    console.log(`Uploaded ${name}:`, res.id ? 'Success' : res);
}

async function main() {
    console.log('Creating release...');
    const releaseData = {
        tag_name: TAG,
        target_commitish: 'main',
        name: RELEASE_NAME,
        body: RELEASE_BODY,
        draft: false,
        prerelease: false,
        generate_release_notes: false
    };

    const res = await request('POST', `https://api.github.com/repos/${OWNER}/${REPO}/releases`, releaseData);
    
    console.log('RES:', JSON.stringify(res, null, 2));

    if (res.errors || res.message === "Validation Failed") {
        console.error('Error creating release:', res);
        // Maybe it already exists? Let's try to get it
        const getRes = await request('GET', `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
        if (getRes.upload_url) {
            console.log('Release already exists. Uploading to existing release...');
            res.upload_url = getRes.upload_url;
        } else {
            return;
        }
    }

    const uploadUrl = res.upload_url;
    
    const FILES_TO_UPLOAD = [
        { path: path.resolve(__dirname, 'source_code', 'dist_electron', `PCSHogar_Setup_${TAG}.exe`), name: `PCSHogar_Setup_${TAG}.exe`, mime: 'application/x-msdownload' },
        { path: path.resolve(__dirname, 'source_code', 'dist_android', `PCSHogar_Setup_${TAG}.apk`), name: `PCSHogar_Setup_${TAG}.apk`, mime: 'application/vnd.android.package-archive' }
    ];

    for (const file of FILES_TO_UPLOAD) {
        if (fs.existsSync(file.path)) {
            await uploadAsset(uploadUrl, file.path, file.name, file.mime);
        } else {
            console.log(`${file.name} not found!`);
        }
    }
    
    console.log('All done!');
}

main().catch(console.error);
