const fs = require('fs');
const path = require('path');

const messagesContent = fs.readFileSync('src/lib/i18n/messages.ts', 'utf8');
const enSection = messagesContent.match(/en: \{([\s\S]*?)\},/)[1];
const existingKeys = new Set();
const keyRegex = /^\s*([a-zA-Z0-9_]+):/gm;
let match;
while ((match = keyRegex.exec(enSection)) !== null) {
    existingKeys.add(match[1]);
}

const usedKeys = new Set();
function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                walk(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const tRegex = /t\('([^']+)'\)/g;
            while ((match = tRegex.exec(content)) !== null) {
                usedKeys.add(match[1]);
            }
        }
    }
}

walk('src');

const missingKeys = [...usedKeys].filter(key => !existingKeys.has(key)).sort();
console.log(JSON.stringify(missingKeys, null, 2));
