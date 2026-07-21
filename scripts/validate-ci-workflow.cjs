const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, '../.github/workflows/verify-reconstruction.yml');

if (!fs.existsSync(wfPath)) {
  console.error('CI workflow file not found');
  process.exit(1);
}

const content = fs.readFileSync(wfPath, 'utf8');
let failed = false;

function check(condition, msg) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    failed = true;
  }
}

check(content.includes('name: Verify Reconstruction'), 'Missing workflow name');
check(content.includes('push:'), 'Missing push trigger');
check(content.includes('main'), 'Missing main branch in push');
check(content.includes('pull_request:'), 'Missing pull_request trigger');
check(content.includes('workflow_dispatch:'), 'Missing workflow_dispatch trigger');
check(content.includes('permissions:') && content.includes('contents: read'), 'Missing contents: read permissions');
check(!content.includes('write'), 'Should not contain write permissions');

check(content.includes('actions/checkout@v4'), 'Missing actions/checkout@v4');
check(content.includes('actions/setup-node@v4'), 'Missing actions/setup-node@v4');
check(content.includes("node-version: '22'"), 'Missing Node.js 22');

check(content.includes('npm ci'), 'Missing npm ci');
check(content.includes('npm run verify:reconstruction'), 'Missing npm run verify:reconstruction');

check(!content.includes('deploy'), 'Should not contain deploy commands');
check(!content.includes('firebase deploy'), 'Should not contain firebase deploy');
check(!content.includes('git push'), 'Should not contain git push');

if (failed) {
  process.exit(1);
} else {
  console.log('CI workflow validation passed.');
}
