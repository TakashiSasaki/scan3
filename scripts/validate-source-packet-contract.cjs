const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { execFileSync } = require('child_process');

function check() {
  const rootDir = path.join(__dirname, '..');
  const schemaPath = path.join(rootDir, 'reconstruction', 'source-packet.schema.json');
  if (!fs.existsSync(schemaPath)) throw new Error('Schema file not found');
  
  const schemaStr = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaStr);
  
  const ajv = new Ajv({ strict: true, allErrors: true });
  ajv.compile(schema);
  
  const matrixPath = path.join(rootDir, 'reconstruction', 'source-packet-constraint-matrix.md');
  if (!fs.existsSync(matrixPath)) throw new Error('Constraint matrix not found');

  const constraintsPath = path.join(rootDir, 'reconstruction', 'source-packet-constraints.json');
  if (!fs.existsSync(constraintsPath)) throw new Error('Constraint JSON not found');
  
  const expectationsPath = path.join(rootDir, 'reconstruction', 'source-packet-fixture-expectations.json');
  if (!fs.existsSync(expectationsPath)) throw new Error('Fixture expectations not found');
  
  const expectations = JSON.parse(fs.readFileSync(expectationsPath, 'utf-8'));
  for (const exp of expectations) {
    if (exp.schemaExpected === "PASS" && exp.operationalExpected === "FAIL") {
      if (!exp.reason) throw new Error(`Missing reason for schema-valid/operational-invalid fixture: ${exp.fixture}`);
    }
    if (exp.schemaExpected === "FAIL" && exp.operationalExpected === "PASS") {
      throw new Error(`Schema-invalid fixture cannot be operational-only: ${exp.fixture}`);
    }
  }

  const examplesDir = path.join(rootDir, 'reconstruction', 'examples');
  const fixtureDirs = new Set(fs.readdirSync(examplesDir).filter(name => fs.statSync(path.join(examplesDir, name)).isDirectory()));
  const expectedFixtures = new Set(expectations.map(exp => exp.fixture));

  for (const name of fixtureDirs) {
    if (!expectedFixtures.has(name)) throw new Error(`Fixture directory missing from catalog: ${name}`);
  }
  for (const name of expectedFixtures) {
    if (!fixtureDirs.has(name)) throw new Error(`Catalog fixture missing from directory: ${name}`);
  }

  const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));
  for (const c of constraints) {
    if (c.status === 'implemented' && (!c.fixtures || c.fixtures.length === 0)) {
      throw new Error(`Implemented constraint missing fixtures: ${c.id}`);
    }
    if (c.status === 'deferred' && c.description.toLowerCase().includes('implemented')) {
      throw new Error(`Deferred constraint must not claim implementation: ${c.id}`);
    }
    if (c.authoritativeLayer === 'schema') {
      if (!c.schemaPointer) throw new Error(`Schema authoritative constraint missing pointer: ${c.id}`);
      // Basic check for pointer existence in schema object structure could be added here, but string presence is a start
    } else if (c.authoritativeLayer === 'operational' || c.authoritativeLayer === 'both') {
      if (!c.operationalEvidence || !c.operationalEvidence.file || !c.operationalEvidence.marker) {
        throw new Error(`Operational constraint missing evidence: ${c.id}`);
      }
      const evFile = path.join(rootDir, c.operationalEvidence.file);
      if (!fs.existsSync(evFile)) throw new Error(`Evidence file not found: ${c.operationalEvidence.file}`);
      const content = fs.readFileSync(evFile, 'utf8');
      if (!content.includes(c.operationalEvidence.marker)) {
        throw new Error(`Evidence marker '${c.operationalEvidence.marker}' not found in ${c.operationalEvidence.file} for ${c.id}`);
      }
    }
  }

  // Ensure matrix is up to date
  const currentMatrix = fs.readFileSync(matrixPath, 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'generate-source-packet-constraint-matrix.cjs')]);
  const newMatrix = fs.readFileSync(matrixPath, 'utf8');
  if (currentMatrix !== newMatrix) {
    throw new Error('Constraint matrix was not up to date. Run generator.');
  }

  console.log("Running schema tests...");
  execFileSync(process.execPath, [path.join(__dirname, 'test-source-packet-schema.cjs')], { stdio: 'inherit' });

  console.log("Running operational tests...");
  execFileSync(process.execPath, [path.join(__dirname, 'test-source-packet-validator.cjs')], { stdio: 'inherit' });
  
  console.log("Contract validation successful.");
}

try {
  check();
} catch (e) {
  console.error("Contract validation failed:");
  console.error(e.message);
  process.exit(1);
}
