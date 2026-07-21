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

function validateCommonTopLevel(data, scriptName) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Output of ${scriptName} must be a non-null, non-array object`);
  }

  const expectedTopKeys = ['passed', 'failed', 'skipped', 'notApplicable', 'tests'];
  const actualKeys = Object.keys(data);
  if (actualKeys.length !== expectedTopKeys.length || !expectedTopKeys.every(k => actualKeys.includes(k))) {
    throw new Error(`Output of ${scriptName} top-level object must have exactly keys: ${expectedTopKeys.join(', ')} (got: ${actualKeys.join(', ')})`);
  }

  for (const countKey of ['passed', 'failed', 'skipped', 'notApplicable']) {
    const val = data[countKey];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
      throw new Error(`Output of ${scriptName} field "${countKey}" must be a non-negative integer (got: ${JSON.stringify(val)})`);
    }
  }

  if (!Array.isArray(data.tests)) {
    throw new Error(`Output of ${scriptName} field "tests" must be an array`);
  }

  let countPass = 0, countFail = 0, countSkip = 0, countNotApp = 0;
  for (const t of data.tests) {
    if (t && typeof t === 'object' && !Array.isArray(t)) {
      if (t.result === 'PASS') countPass++;
      else if (t.result === 'FAIL') countFail++;
      else if (t.result === 'SKIP') countSkip++;
      else if (t.result === 'NOT_APPLICABLE') countNotApp++;
    }
  }

  if (data.passed !== countPass) {
    throw new Error(`Output of ${scriptName} "passed" count (${data.passed}) does not equal tests with result "PASS" (${countPass})`);
  }
  if (data.failed !== countFail) {
    throw new Error(`Output of ${scriptName} "failed" count (${data.failed}) does not equal tests with result "FAIL" (${countFail})`);
  }
  if (data.skipped !== countSkip) {
    throw new Error(`Output of ${scriptName} "skipped" count (${data.skipped}) does not equal tests with result "SKIP" (${countSkip})`);
  }
  if (data.notApplicable !== countNotApp) {
    throw new Error(`Output of ${scriptName} "notApplicable" count (${data.notApplicable}) does not equal tests with result "NOT_APPLICABLE" (${countNotApp})`);
  }

  const sumCounts = data.passed + data.failed + data.skipped + data.notApplicable;
  if (sumCounts !== data.tests.length) {
    throw new Error(`Output of ${scriptName} sum of counts (${sumCounts}) does not equal tests array length (${data.tests.length})`);
  }
}

function validateValidatorItem(item) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('Validator result item must be a non-null, non-array object');
  }

  const expectedKeys = ['name', 'kind', 'result', 'expectedErrorCode', 'actualErrorCode', 'reason'];
  const actualKeys = Object.keys(item);
  if (actualKeys.length !== expectedKeys.length || !expectedKeys.every(k => actualKeys.includes(k))) {
    throw new Error(`Validator result item must have exactly keys: ${expectedKeys.join(', ')} (got: ${actualKeys.join(', ')})`);
  }

  if (typeof item.name !== 'string' || item.name.trim() === '' || item.name !== item.name.trim()) {
    throw new Error(`Validator result item "name" must be a trimmed non-empty string (got: ${JSON.stringify(item.name)})`);
  }

  if (item.kind !== 'static' && item.kind !== 'dynamic') {
    throw new Error(`Validator result item "kind" must be "static" or "dynamic" (got: ${JSON.stringify(item.kind)})`);
  }

  if (!['PASS', 'FAIL', 'SKIP', 'NOT_APPLICABLE'].includes(item.result)) {
    throw new Error(`Validator result item "result" must be PASS, FAIL, SKIP, or NOT_APPLICABLE (got: ${JSON.stringify(item.result)})`);
  }

  if (item.expectedErrorCode !== null) {
    if (typeof item.expectedErrorCode !== 'string' || !VALID_OPERATIONAL_ERROR_CODES.has(item.expectedErrorCode)) {
      throw new Error(`Validator result item "expectedErrorCode" must be a registered error code or null (got: ${JSON.stringify(item.expectedErrorCode)})`);
    }
  }

  if (item.actualErrorCode !== null) {
    if (typeof item.actualErrorCode !== 'string' || !VALID_OPERATIONAL_ERROR_CODES.has(item.actualErrorCode)) {
      throw new Error(`Validator result item "actualErrorCode" must be a registered error code or null (got: ${JSON.stringify(item.actualErrorCode)})`);
    }
  }

  if (item.reason !== null && typeof item.reason !== 'string') {
    throw new Error(`Validator result item "reason" must be a string or null (got: ${JSON.stringify(item.reason)})`);
  }
}

function validatePathHelperItem(item) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('Path helper result item must be a non-null, non-array object');
  }

  const expectedKeys = ['suite', 'name', 'result', 'expectedOutcome', 'expectedErrorCode', 'actualErrorCode', 'reason'];
  const actualKeys = Object.keys(item);
  if (actualKeys.length !== expectedKeys.length || !expectedKeys.every(k => actualKeys.includes(k))) {
    throw new Error(`Path helper result item must have exactly keys: ${expectedKeys.join(', ')} (got: ${actualKeys.join(', ')})`);
  }

  if (item.suite !== 'source-packet-path-helper') {
    throw new Error(`Path helper result item "suite" must be "source-packet-path-helper" (got: ${JSON.stringify(item.suite)})`);
  }

  if (typeof item.name !== 'string' || item.name.trim() === '' || item.name !== item.name.trim()) {
    throw new Error(`Path helper result item "name" must be a trimmed non-empty string (got: ${JSON.stringify(item.name)})`);
  }

  if (!['PASS', 'FAIL', 'SKIP', 'NOT_APPLICABLE'].includes(item.result)) {
    throw new Error(`Path helper result item "result" must be PASS, FAIL, SKIP, or NOT_APPLICABLE (got: ${JSON.stringify(item.result)})`);
  }

  if (item.expectedOutcome !== 'PASS' && item.expectedOutcome !== 'ERROR') {
    throw new Error(`Path helper result item "expectedOutcome" must be "PASS" or "ERROR" (got: ${JSON.stringify(item.expectedOutcome)})`);
  }

  if (item.expectedOutcome === 'ERROR') {
    if (typeof item.expectedErrorCode !== 'string' || !VALID_OPERATIONAL_ERROR_CODES.has(item.expectedErrorCode)) {
      throw new Error(`Path helper result item "expectedErrorCode" for ERROR outcome must be a registered error code (got: ${JSON.stringify(item.expectedErrorCode)})`);
    }
  } else {
    if (item.expectedErrorCode !== null) {
      throw new Error(`Path helper result item "expectedErrorCode" for PASS outcome must be null (got: ${JSON.stringify(item.expectedErrorCode)})`);
    }
  }

  if (item.actualErrorCode !== null) {
    if (typeof item.actualErrorCode !== 'string' || !VALID_OPERATIONAL_ERROR_CODES.has(item.actualErrorCode)) {
      throw new Error(`Path helper result item "actualErrorCode" must be a registered error code or null (got: ${JSON.stringify(item.actualErrorCode)})`);
    }
  }

  if (item.reason !== null && typeof item.reason !== 'string') {
    throw new Error(`Path helper result item "reason" must be a string or null (got: ${JSON.stringify(item.reason)})`);
  }
}

// Helper to run command and parse JSON
function runJsonTestCommand(scriptRelativePath, itemValidator) {
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

  try {
    validateCommonTopLevel(data, scriptRelativePath);
    for (const item of data.tests) {
      itemValidator(item);
    }
  } catch (e) {
    console.error(`FAIL: Output of ${scriptRelativePath} validation failed: ${e.message}`);
    process.exit(1);
  }

  return data;
}

console.log('Validating operational error evidence...');

const validatorOutput = runJsonTestCommand('scripts/test-source-packet-validator.cjs', validateValidatorItem);
const pathHelperOutput = runJsonTestCommand('scripts/test-source-packet-path-helper.cjs', validatePathHelperItem);

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
