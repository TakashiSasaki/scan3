const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runValidator(inventoryPath) {
  try {
    execSync(`node scripts/validate-accepted-artifacts.cjs ${inventoryPath}`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

let failed = 0;
const tempInventoryPath = path.join(__dirname, 'temp-inventory.json');

// Positive: Current
if (!runValidator('reconstruction/accepted-artifacts.json')) {
  console.error('[FAIL] Current inventory failed validation.');
  failed++;
} else {
  console.log('[PASS] Current inventory validated.');
}

function testFailure(name, mutator) {
  const current = JSON.parse(fs.readFileSync('reconstruction/accepted-artifacts.json', 'utf-8'));
  const mutated = mutator(current);
  fs.writeFileSync(tempInventoryPath, JSON.stringify(mutated, null, 2));
  if (runValidator(tempInventoryPath)) {
    console.error(`[FAIL] Negative test passed unexpectedly: ${name}`);
    failed++;
  } else {
    console.log(`[PASS] Negative test correctly failed: ${name}`);
  }
}

// Negative: Missing inventory itself
testFailure('Missing inventory self-reference', (arr) => arr.filter(p => p !== 'reconstruction/accepted-artifacts.json'));

// Negative: Missing validator itself
testFailure('Missing validator self-reference', (arr) => arr.filter(p => p !== 'scripts/validate-accepted-artifacts.cjs'));

// Negative: Duplicate entry
testFailure('Duplicate entry', (arr) => [...arr, arr[0]]);

// Negative: Absolute path
testFailure('Absolute path', (arr) => [...arr, '/some/absolute/path.txt']);

// Negative: .. segment
testFailure('.. segment', (arr) => [...arr, 'scripts/../README.md']);

// Negative: Non-existent file
testFailure('Non-existent file', (arr) => [...arr, 'does-not-exist.md']);

// Negative: Directory instead of file
testFailure('Directory instead of file', (arr) => [...arr, 'scripts']);

if (fs.existsSync(tempInventoryPath)) {
  fs.unlinkSync(tempInventoryPath);
}

if (failed > 0) {
  console.error(`Artifact validator tests failed: ${failed}`);
  process.exit(1);
} else {
  console.log('All artifact validator tests passed.');
}
