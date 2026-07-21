const fs = require('fs');
const path = require('path');
const { validateRawRelativePath } = require('./validate-source-packet.cjs');
const { OPERATIONAL_ERROR_CODES } = require('./lib/operational-error-codes.cjs');

const isJson = process.argv.includes('--json');
const registryPath = path.join(__dirname, '../reconstruction/source-packet-direct-test-expectations.json');

let rawRegistry;
try {
  rawRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (e) {
  if (!isJson) {
    console.error(`SETUP FAIL: Unable to read or parse direct test expectations registry: ${e.message}`);
  }
  process.exit(1);
}

if (!Array.isArray(rawRegistry)) {
  if (!isJson) {
    console.error('SETUP FAIL: Direct test expectations registry must be an array');
  }
  process.exit(1);
}

const suite = rawRegistry.find(s => s && s.name === 'source-packet-path-helper');
if (!suite) {
  if (!isJson) {
    console.error('SETUP FAIL: Suite "source-packet-path-helper" not found in direct test registry');
  }
  process.exit(1);
}

if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
  if (!isJson) {
    console.error('SETUP FAIL: Suite "source-packet-path-helper" has no cases in direct test registry');
  }
  process.exit(1);
}

let passed = 0;
let failed = 0;
let skipped = 0;
let notApplicable = 0;
const testResults = [];

for (const caseDef of suite.cases) {
  const caseName = caseDef.name;
  const input = caseDef.input;
  const fieldName = caseDef.fieldName || 'payloadPath';
  const expectedOutcome = caseDef.expectedOutcome;
  const expectedErrorCode = expectedOutcome === 'ERROR' ? caseDef.expectedErrorCode : null;

  let actualSuccess = false;
  let actualErrorCode = null;
  let execError = null;

  try {
    validateRawRelativePath(input, fieldName);
    actualSuccess = true;
  } catch (e) {
    actualSuccess = false;
    actualErrorCode = e.code || null;
    execError = e.message || String(e);
  }

  let result = 'FAIL';
  let reason = null;

  if (expectedOutcome === 'PASS') {
    if (actualSuccess) {
      result = 'PASS';
    } else {
      result = 'FAIL';
      reason = `Expected PASS but thrown error code [${actualErrorCode}]: ${execError}`;
    }
  } else if (expectedOutcome === 'ERROR') {
    if (!actualSuccess && actualErrorCode === expectedErrorCode) {
      result = 'PASS';
    } else if (actualSuccess) {
      result = 'FAIL';
      reason = `Expected ERROR code [${expectedErrorCode}] but operation succeeded without throwing`;
    } else {
      result = 'FAIL';
      reason = `Expected ERROR code [${expectedErrorCode}], but got [${actualErrorCode}]: ${execError}`;
    }
  } else {
    result = 'FAIL';
    reason = `Invalid expectedOutcome in registry case: ${expectedOutcome}`;
  }

  if (result === 'PASS') {
    passed++;
  } else {
    failed++;
  }

  testResults.push({
    suite: suite.name,
    name: caseName,
    result,
    expectedOutcome,
    expectedErrorCode,
    actualErrorCode,
    reason
  });

  if (!isJson) {
    if (result === 'PASS') {
      console.log(`PASS: ${caseName} (${expectedOutcome === 'ERROR' ? `Received expected code [${actualErrorCode}]` : 'Success'})`);
    } else {
      console.error(`FAIL: ${caseName} — ${reason}`);
    }
  }
}

if (isJson) {
  const jsonOutput = {
    passed,
    failed,
    skipped,
    notApplicable,
    tests: testResults
  };
  console.log(JSON.stringify(jsonOutput, null, 2));
} else {
  console.log(`\nPath Helper Test Summary: PASS: ${passed}, FAIL: ${failed}, SKIP: ${skipped}, NOT_APPLICABLE: ${notApplicable}`);
}

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
