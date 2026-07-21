const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../reconstruction/accepted-artifacts.json');
let inventory;

try {
  inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
} catch (e) {
  console.error(`FAIL: Cannot parse accepted-artifacts.json: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(inventory)) {
  console.error('FAIL: Inventory must be an array');
  process.exit(1);
}

const seen = new Set();
let allPassed = true;

for (const entry of inventory) {
  if (typeof entry !== 'string') {
    console.error(`FAIL: Invalid entry type: ${typeof entry}`);
    allPassed = false;
    continue;
  }
  
  if (path.isAbsolute(entry) || entry.includes('..') || entry.startsWith('./')) {
    console.error(`FAIL: Invalid relative path: ${entry}`);
    allPassed = false;
    continue;
  }

  if (seen.has(entry)) {
    console.error(`FAIL: Duplicate path in inventory: ${entry}`);
    allPassed = false;
    continue;
  }
  seen.add(entry);

  const fullPath = path.resolve(__dirname, '..', entry);
  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: Missing artifact: ${entry}`);
    allPassed = false;
    continue;
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    console.error(`FAIL: Artifact is not a regular file: ${entry}`);
    allPassed = false;
    continue;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('Accepted artifacts validation passed.');
}
