const { execSync } = require('child_process');
const path = require('path');

const validatorPath = path.join(__dirname, 'validate-source-packet.cjs');
const examplesDir = path.join(__dirname, '../reconstruction/examples');

const tests = [
  { name: 'minimal', expectSuccess: true },
  { name: 'invalid-path-traversal', expectSuccess: false },
  { name: 'invalid-hash', expectSuccess: false },
  { name: 'invalid-size', expectSuccess: false },
  { name: 'invalid-duplicate-destination', expectSuccess: false },
];

let allPassed = true;

for (const test of tests) {
  const target = path.join(examplesDir, test.name);
  let success = false;
  try {
    execSync(`node ${validatorPath} ${target}`, { stdio: 'ignore' });
    success = true;
  } catch (e) {
    success = false;
  }

  if (success === test.expectSuccess) {
    console.log(`PASS: ${test.name}`);
  } else {
    console.error(`FAIL: ${test.name} (Expected success: ${test.expectSuccess}, but got: ${success})`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('All validator tests passed.');
}
