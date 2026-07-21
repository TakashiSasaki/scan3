const fs = require("fs");
const path = require("path");
const { createValidator } = require("./lib/source-packet-schema-validator.cjs");

const expectationsPath = path.join(__dirname, "..", "reconstruction", "source-packet-fixture-expectations.json");
const expectations = JSON.parse(fs.readFileSync(expectationsPath, "utf-8"));
const fixturesDir = path.join(__dirname, "..", "reconstruction", "examples");

const validator = createValidator();

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

let failed = 0;

for (const exp of expectations) {
  const fixturePath = path.join(fixturesDir, exp.fixture, "manifest.json");
  if (!fs.existsSync(fixturePath)) {
    console.error(`Fixture not found: ${fixturePath}`);
    failed++;
    continue;
  }
  
  const manifest = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  const { valid, errors } = validator.validateManifestSchema(manifest);
  
  if (exp.schemaExpected === "PASS" && !valid) {
    console.error(`[FAIL] ${exp.fixture} expected schema PASS, but got FAIL`);
    console.error(JSON.stringify(errors, null, 2));
    failed++;
  } else if (exp.schemaExpected === "FAIL") {
    if (valid) {
      console.error(`[FAIL] ${exp.fixture} expected schema FAIL, but got PASS`);
      failed++;
    } else {
      const expectedKeyword = exp.expectedSchemaKeyword;
      const expectedPathClean = exp.expectedSchemaPath ? exp.expectedSchemaPath.replace(/^#/, '') : null;
      const expectedInstancePath = exp.expectedSchemaInstancePath !== undefined ? exp.expectedSchemaInstancePath : null;
      const expectedParams = exp.expectedSchemaParams !== undefined ? exp.expectedSchemaParams : null;

      const hasExactMatchingError = errors && errors.some(err => {
        const errPathClean = (err.schemaPath || '').replace(/^#/, '');
        const keywordMatch = !expectedKeyword || err.keyword === expectedKeyword;
        const pathMatch = !expectedPathClean || errPathClean === expectedPathClean;
        const instanceMatch = expectedInstancePath === null || err.instancePath === expectedInstancePath;
        const paramsMatch = expectedParams === null || deepEqual(err.params, expectedParams);
        return keywordMatch && pathMatch && instanceMatch && paramsMatch;
      });

      if (!hasExactMatchingError) {
        console.error(`[FAIL] ${exp.fixture} expected schema FAIL with exact keyword="${expectedKeyword}", path="${expectedPathClean}", instancePath="${expectedInstancePath}", params=${JSON.stringify(expectedParams)}, but got errors:`);
        console.error(JSON.stringify(errors, null, 2));
        failed++;
      } else {
        console.log(`[PASS] ${exp.fixture} (Schema: FAIL as expected)`);
      }
    }
  } else if (exp.schemaExpected === "SKIP_ALLOWED") {
    console.log(`[SKIP] ${exp.fixture} (schema validation skipped or ignored)`);
  } else {
    console.log(`[PASS] ${exp.fixture} (Schema: ${exp.schemaExpected})`);
  }
}

if (failed > 0) {
  console.error(`Schema tests failed: ${failed}`);
  process.exit(1);
} else {
  console.log("All schema tests passed.");
}
