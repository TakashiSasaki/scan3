const fs = require("fs");
const path = require("path");
const { createValidator } = require("./lib/source-packet-schema-validator.cjs");

const expectationsPath = path.join(__dirname, "..", "reconstruction", "source-packet-fixture-expectations.json");
const expectations = JSON.parse(fs.readFileSync(expectationsPath, "utf-8"));
const fixturesDir = path.join(__dirname, "..", "reconstruction", "examples");

const validator = createValidator();

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
  } else if (exp.schemaExpected === "FAIL" && valid) {
    console.error(`[FAIL] ${exp.fixture} expected schema FAIL, but got PASS`);
    failed++;
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
