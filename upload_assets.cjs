const https = require('https');
const fs = require('fs');
const path = require('path');
const TOKEN = process.env.GITHUB_TOKEN;
const UPLOAD_URL = 'https://uploads.github.com/repos/YoTeAyudoESP/pcshogar.github.io/releases/352827325/assets';

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
    const url = uploadUrl + '?name=' + encodeURIComponent(name);
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
    await uploadAsset(UPLOAD_URL, path.resolve(__dirname, 'source_code', 'dist_electron', 'PCSHogar_Setup_v1.8.8.exe'), 'PCSHogar_Setup_v1.8.8.exe', 'application/x-msdownload');
    await uploadAsset(UPLOAD_URL, path.resolve(__dirname, 'source_code', 'dist_android', 'PCSHogar_Setup_v1.8.8.apk'), 'PCSHogar_Setup_v1.8.8.apk', 'application/vnd.android.package-archive');
}
main();
