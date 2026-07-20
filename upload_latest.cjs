const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'YoTeAyudoESP';
const REPO = 'pcshogar.github.io';
const TAG = 'v1.9.0';
const RELEASE_NAME = 'PCS Hogar v1.9.0';
const RELEASE_BODY = '?? Novedades v1.9.0:\n- Solucionado el problema de visualizaci�n en la creaci�n de huchas en pantallas peque�as.\n- Mejoras de usabilidad con autoscroll y validaci�n de campos obligatorios.';

function request(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const { URL } = require('url');
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'User-Agent': 'Node.js',
                'Authorization': 'token ' + TOKEN,
                ...headers
            },
            timeout: 1000000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch(e) { resolve(body); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function uploadAsset(uploadUrl, filePath, name, mimeType) {
    console.log('Uploading ' + name + '...');
    const data = fs.readFileSync(filePath);
    const url = uploadUrl.replace('{?name,label}', '') + '?name=' + encodeURIComponent(name);
    try {
        const res = await request('POST', url, data, {
            'Content-Type': mimeType,
            'Content-Length': data.length
        });
        console.log('Uploaded ' + name + ':', res.id ? 'Success' : res);
    } catch (e) {
        console.error('Failed to upload ' + name + ':', e);
    }
}

async function main() {
    console.log('Creating release...');
    const releaseData = {
        tag_name: TAG,
        name: RELEASE_NAME,
        body: RELEASE_BODY,
        draft: false,
        prerelease: false
    };

    let res = await request('POST', 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/releases', JSON.stringify(releaseData), {
        'Content-Type': 'application/json'
    });
    
    if (res.errors && res.errors[0] && res.errors[0].code === 'already_exists') {
        console.log('Release already exists, getting it...');
        res = await request('GET', 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/releases/tags/' + TAG);
    } else {
        console.log('RES:', res);
    }

    if (!res.upload_url) {
        console.error('Failed to get upload URL', res);
        return;
    }

    const uploadUrl = res.upload_url;
    
    
    await uploadAsset(uploadUrl, path.resolve(__dirname, 'latest.yml'), 'latest.yml', 'text/yaml');
    await uploadAsset(uploadUrl, path.resolve(__dirname, 'PCSHogar_Setup_v1.9.0.exe.blockmap'), 'PCSHogar_Setup_v1.9.0.exe.blockmap', 'application/octet-stream');
}

main();
