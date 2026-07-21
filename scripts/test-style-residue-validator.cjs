const { execFileSync } = require('child_process');
const path = require('path');

const validatorPath = path.join(__dirname, 'validate-style-residues.cjs');

function runTest(target, expectSuccess) {
  let success = false;
  try {
    execFileSync(process.execPath, [validatorPath, target], { stdio: 'ignore' });
    success = true;
  } catch (e) {
    success = false;
  }
  
  if (success === expectSuccess) {
    console.log(`PASS: ${target}`);
  } else {
    console.error(`FAIL: ${target} (Expected ${expectSuccess}, got ${success})`);
    process.exit(1);
  }
}

runTest('scripts/fixtures/style-residues/valid-semantic.tsx', true);
runTest('scripts/fixtures/style-residues/invalid-tailwind.tsx', false);
runTest('src', true);

console.log('All style residue validator tests passed.');
