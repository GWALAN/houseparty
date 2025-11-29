const fs = require('fs');

const filePath = 'app.config.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the version string: version: '1.0.0' OR version: "1.0.0"
const versionRegex = /version:\s*['"](\d+)\.(\d+)\.(\d+)['"]/;
const match = content.match(versionRegex);

if (!match) {
  console.error('❌ Could not find version in app.config.js');
  process.exit(1);
}

let major = parseInt(match[1], 10);
let minor = parseInt(match[2], 10);
let patch = parseInt(match[3], 10);

// SIMPLE bump: increase patch by 1
patch++;

const newVersion = `${major}.${minor}.${patch}`;
content = content.replace(versionRegex, `version: '${newVersion}'`);

fs.writeFileSync(filePath, content);

console.log(`✅ Version bumped to ${newVersion}`);
