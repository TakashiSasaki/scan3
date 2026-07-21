const fs = require('fs');
const path = require('path');

const inventoryPath = process.argv[2] 
  ? path.resolve(process.argv[2]) 
  : path.join(__dirname, '../reconstruction/accepted-artifacts.json');

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

const REQUIRED_ENTRIES = [
  'reconstruction/accepted-artifacts.json',
  'scripts/validate-accepted-artifacts.cjs',
  'policy/regression-prevention.md',
  'policy/decision-gates.md',
  'AGENTS.md',
  'README.md',
  'package.json',
  'package-lock.json',
  '.github/workflows/verify-reconstruction.yml',
  'reconstruction/source-packet-constraints.json',
  'reconstruction/source-packet-fixture-expectations.json',
  'scripts/test-source-packet-validator.cjs',
  'scripts/test-source-packet-schema.cjs',
  'scripts/validate-source-packet-contract.cjs',
  'scripts/validate-agent-skills.cjs',
  'scripts/validate-ci-workflow.cjs',
  'scripts/validate-control-registries.cjs',
  'reconstruction/agent-skills.json'
];

const rootDir = path.resolve(__dirname, '..');
const seen = new Set();
let allPassed = true;

for (const entry of inventory) {
  if (typeof entry !== 'string' || entry.trim() === '') {
    console.error(`FAIL: Invalid entry: empty or whitespace-only`);
    allPassed = false;
    continue;
  }
  
  if (entry.includes('\0')) {
    console.error(`FAIL: Invalid entry: NUL character`);
    allPassed = false;
    continue;
  }

  if (path.isAbsolute(entry) || /^[a-zA-Z]:/.test(entry) || entry.startsWith('\\\\')) {
    console.error(`FAIL: Invalid absolute, Windows drive, or UNC path: ${entry}`);
    allPassed = false;
    continue;
  }

  const segments = entry.split(/[/\\]/);
  if (segments.includes('.') || segments.includes('..')) {
    console.error(`FAIL: Invalid segment (. or ..): ${entry}`);
    allPassed = false;
    continue;
  }

  if (seen.has(entry)) {
    console.error(`FAIL: Duplicate path in inventory: ${entry}`);
    allPassed = false;
    continue;
  }
  seen.add(entry);

  const fullPath = path.resolve(rootDir, entry);
  if (!fullPath.startsWith(rootDir + path.sep) && fullPath !== rootDir) {
    console.error(`FAIL: Path escapes repository: ${entry}`);
    allPassed = false;
    continue;
  }

  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: Missing artifact: ${entry}`);
    allPassed = false;
    continue;
  }

  const stat = fs.lstatSync(fullPath);
  if (stat.isSymbolicLink()) {
    console.error(`FAIL: Artifact is a symbolic link: ${entry}`);
    allPassed = false;
    continue;
  }
  if (!stat.isFile()) {
    console.error(`FAIL: Artifact is not a regular file: ${entry}`);
    allPassed = false;
    continue;
  }
  const realPath = fs.realpathSync(fullPath);
  if (!realPath.startsWith(rootDir + path.sep)) {
    console.error(`FAIL: Artifact realpath escapes repository: ${entry}`);
    allPassed = false;
    continue;
  }
}

for (const req of REQUIRED_ENTRIES) {
  if (!seen.has(req)) {
    console.error(`FAIL: Missing required self-protecting entry: ${req}`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('Accepted artifacts validation passed.');
}
