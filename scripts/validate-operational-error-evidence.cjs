const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { OPERATIONAL_ERROR_CODES, VALID_OPERATIONAL_ERROR_CODES } = require('./lib/operational-error-codes.cjs');

const rootDir = path.join(__dirname, '..');
const constraintsPath = path.join(rootDir, 'reconstruction/source-packet-constraints.json');
const staticCatalogPath = path.join(rootDir, 'reconstruction/source-packet-fixture-expectations.json');
const dynamicRegistryPath = path.join(rootDir, 'reconstruction/source-packet-dynamic-test-expectations.json');
const directRegistryPath = path.join(rootDir, 'reconstruction/source-packet-direct-test-expectations.json');

const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));
const staticCatalog = JSON.parse(fs.readFileSync(staticCatalogPath, 'utf8'));
const dynamicRegistry = JSON.parse(fs.readFileSync(dynamicRegistryPath, 'utf8'));
const directRegistry = JSON.parse(fs.readFileSync(directRegistryPath, 'utf8'));

// Build lookup map of test name -> constraintIds
const testNameToConstraintIds = new Map();
const allRegisteredExecutedTests = new Set();

for (const entry of staticCatalog) {
  testNameToConstraintIds.set(entry.fixture, entry.constraintIds || []);
  if (entry.operationalExpected !== 'NOT_APPLICABLE' && entry.operationalExpected !== 'SKIP_ALLOWED') {
    allRegisteredExecutedTests.add(entry.fixture);
  }
}

for (const entry of dynamicRegistry) {
  testNameToConstraintIds.set(entry.name, entry.constraintIds || []);
  allRegisteredExecutedTests.add(entry.name);
}

for (const suite of directRegistry) {
  for (const c of suite.cases) {
    testNameToConstraintIds.set(c.name, suite.constraintIds || []);
    allRegisteredExecutedTests.add(c.name);
  }
}

// Helper to run command and parse JSON
function runJsonTestCommand(scriptRelativePath) {
  const scriptPath = path.join(rootDir, scriptRelativePath);
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, [scriptPath, '--json'], { stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    console.error(`FAIL: Execution of ${scriptRelativePath} failed: ${e.stderr || e.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(stdout);
  } catch (e) {
    console.error(`FAIL: Output of ${scriptRelativePath} is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  if (typeof data !== 'object' || data === null || !Array.isArray(data.tests)) {
    console.error(`FAIL: Output of ${scriptRelativePath} does not have required structure ({ passed, failed, skipped, notApplicable, tests })`);
    process.exit(1);
  }

  return data;
}

console.log('Validating operational error evidence...');

const validatorOutput = runJsonTestCommand('scripts/test-source-packet-validator.cjs');
const pathHelperOutput = runJsonTestCommand('scripts/test-source-packet-path-helper.cjs');

const allResults = [...validatorOutput.tests, ...pathHelperOutput.tests];
const observedExecutedTests = new Set();
const observedErrorCodes = new Set();

let failed = false;

for (const item of allResults) {
  const testName = item.name;
  observedExecutedTests.add(testName);

  if (!testNameToConstraintIds.has(testName)) {
    console.error(`FAIL: Executable result references unregistered test name: "${testName}"`);
    failed = true;
  }

  if (item.result === 'FAIL') {
    console.error(`FAIL: Executable result reported FAIL for test: "${testName}" (${item.reason})`);
    failed = true;
  }

  if (item.expectedErrorCode !== null && item.expectedErrorCode !== undefined) {
    if (item.result === 'PASS') {
      if (item.actualErrorCode !== item.expectedErrorCode) {
        console.error(`FAIL: Test "${testName}" expected error code "${item.expectedErrorCode}" but got "${item.actualErrorCode}"`);
        failed = true;
      } else {
        observedErrorCodes.add(item.actualErrorCode);
      }
    } else {
      // SKIP or NOT_APPLICABLE cannot be error code evidence
      if (item.result === 'SKIP' || item.result === 'NOT_APPLICABLE') {
        // Not a failure of the test run, but won't be counted as error code evidence
      }
    }
  }
}

// 1. Check that all registered tests expected to execute were present in output
for (const reqTest of allRegisteredExecutedTests) {
  if (!observedExecutedTests.has(reqTest)) {
    console.error(`FAIL: Registered test "${reqTest}" was expected to execute but was missing from test results`);
    failed = true;
  }
}

// 2. Check that every operational error code in OPERATIONAL_ERROR_CODES has at least one successful observation
for (const code of VALID_OPERATIONAL_ERROR_CODES) {
  if (!observedErrorCodes.has(code)) {
    console.error(`FAIL: Operational error code "${code}" has no successful executable test observation`);
    failed = true;
  }
}

// 3. Check every implemented operational constraint in source-packet-constraints.json
for (const c of constraints) {
  if (c.status === 'implemented' && c.operationalEvidence) {
    const expectedMarker = c.operationalEvidence.marker;
    
    // Find at least one successful test result whose constraintIds includes c.id and whose error code matches marker
    const hasEvidence = allResults.some(res => {
      if (res.result !== 'PASS') return false;
      if (res.actualErrorCode !== expectedMarker) return false;
      const cIds = testNameToConstraintIds.get(res.name) || [];
      return cIds.includes(c.id);
    });

    if (!hasEvidence) {
      console.error(`FAIL: Implemented constraint "${c.id}" (expected marker "${expectedMarker}") has no matching executable test result with result=PASS`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nOperational error evidence validation FAILED.');
  process.exit(1);
} else {
  console.log('PASS: All operational error codes and constraint evidence successfully verified via executable test results.');
  process.exit(0);
}
