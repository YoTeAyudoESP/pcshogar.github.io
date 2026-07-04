const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const gradlePath = path.join(__dirname, '../android/app/build.gradle');
let gradleContent = fs.readFileSync(gradlePath, 'utf8');

const version = packageJson.version;
const versionCode = version.split('.').map(num => num.padStart(2, '0')).join('');
// e.g. 0.1.72 -> 000172 -> 172. 
// However, existing is 34. Let's just blindly increment relative to a base or just use a timestamp? 
// Or better, just regex replace versionName.

console.log(`Syncing Android version to ${version}...`);

// Update versionName
gradleContent = gradleContent.replace(/versionName "[^"]*"/, `versionName "${version}"`);

// Update versionCode (optional but good practice)
// Let's try to just increment the found one? No, stateless.
// Let's construct one: Major * 10000 + Minor * 100 + Patch
const [major, minor, patch] = version.split('.').map(Number);
const newVersionCode = major * 10000 + minor * 100 + patch;
// But wait, user had 34. 
// If I change to 172 (0*10000 + 1*100 + 72), it's > 34. Safe.

gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${newVersionCode}`);

fs.writeFileSync(gradlePath, gradleContent);
console.log(`Updated build.gradle with versionName: ${version}, versionCode: ${newVersionCode}`);
