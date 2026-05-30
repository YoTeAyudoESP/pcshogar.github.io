const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const version = packageJson.version;
const source = path.join(__dirname, '../android/app/build/outputs/apk/debug/app-debug.apk');
const distDir = path.join(__dirname, '../dist_android');
const dest = path.join(distDir, `PCSHogar_v${version}.apk`);

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`APK moved successfully to: ${dest}`);
} else {
    console.error(`Source APK not found at: ${source}`);
    process.exit(1);
}
