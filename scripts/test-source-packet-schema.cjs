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
  } else if (exp.schemaExpected === "FAIL") {
    if (valid) {
      console.error(`[FAIL] ${exp.fixture} expected schema FAIL, but got PASS`);
      failed++;
    } else {
      let keywordMatch = true;
      let pathMatch = true;

      if (exp.expectedSchemaKeyword) {
        keywordMatch = errors && errors.some(err => err.keyword === exp.expectedSchemaKeyword);
      }
      if (exp.expectedSchemaPath) {
        const cleanExpPath = exp.expectedSchemaPath.replace(/^#/, '');
        pathMatch = errors && errors.some(err => {
          const cleanErrPath = (err.schemaPath || '').replace(/^#/, '');
          return cleanErrPath === cleanExpPath ||
                 cleanErrPath.includes(cleanExpPath) ||
                 cleanExpPath.includes(cleanErrPath) ||
                 cleanErrPath.endsWith(cleanExpPath) ||
                 cleanErrPath.startsWith(cleanExpPath);
        });
      }

      if (!keywordMatch || !pathMatch) {
        console.error(`[FAIL] ${exp.fixture} expected schema FAIL with keyword="${exp.expectedSchemaKeyword}" and path="${exp.expectedSchemaPath}", but got errors:`);
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
