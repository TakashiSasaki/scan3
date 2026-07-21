const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { execSync } = require('child_process');

function check() {
  const schemaPath = path.join(__dirname, '..', 'reconstruction', 'source-packet.schema.json');
  if (!fs.existsSync(schemaPath)) throw new Error('Schema file not found');
  
  const schemaStr = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaStr);
  
  const ajv = new Ajv({ strict: true, allErrors: true });
  ajv.compile(schema);
  
  const matrixPath = path.join(__dirname, '..', 'reconstruction', 'source-packet-constraint-matrix.md');
  if (!fs.existsSync(matrixPath)) throw new Error('Constraint matrix not found');
  
  const expectationsPath = path.join(__dirname, '..', 'reconstruction', 'source-packet-fixture-expectations.json');
  if (!fs.existsSync(expectationsPath)) throw new Error('Fixture expectations not found');
  
  const expectations = JSON.parse(fs.readFileSync(expectationsPath, 'utf-8'));
  for (const exp of expectations) {
    if (exp.schemaExpected === "PASS" && exp.operationalExpected === "FAIL") {
      if (!exp.reason) throw new Error(`Missing reason for schema-valid/operational-invalid fixture: ${exp.fixture}`);
    }
  }

  // Schema test
  console.log("Running schema tests...");
  execSync('node scripts/test-source-packet-schema.cjs', { stdio: 'inherit' });

  // Operational test
  console.log("Running operational test for minimal...");
  execSync('node scripts/validate-source-packet.cjs reconstruction/examples/minimal', { stdio: 'inherit' });
  
  console.log("Contract validation successful.");
}

try {
  check();
} catch (e) {
  console.error("Contract validation failed:");
  console.error(e.message);
  process.exit(1);
}
