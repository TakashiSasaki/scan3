const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { execFileSync } = require('child_process');
const { generateMatrix } = require('./generate-source-packet-constraint-matrix.cjs');

function resolveJsonPointer(obj, pointer) {
  if (!pointer || pointer === '') return obj;
  if (!pointer.startsWith('/')) throw new Error(`Invalid JSON pointer: ${pointer}`);
  const parts = pointer.split('/').slice(1);
  let current = obj;
  for (const part of parts) {
    const unescaped = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (current === undefined || current === null || typeof current !== 'object' || !(unescaped in current)) {
      throw new Error(`JSON pointer not resolvable: ${pointer} at ${unescaped}`);
    }
    current = current[unescaped];
  }
  return current;
}

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
    const pair = `${exp.schemaExpected}/${exp.operationalExpected}`;
    if (pair === "PASS/FAIL") {
      if (exp.reason !== null) throw new Error(`PASS/FAIL fixture ${exp.fixture} must have reason: null`);
    } else if (pair === "FAIL/NOT_APPLICABLE") {
      if (!exp.reason) throw new Error(`Missing reason for schema-invalid fixture: ${exp.fixture}`);
    } else if (pair === "PASS/PASS") {
      if (exp.reason !== null) throw new Error(`PASS/PASS fixture ${exp.fixture} must have reason: null`);
    } else {
      throw new Error(`Forbidden outcome pair "${pair}" in fixture ${exp.fixture}`);
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
    if (c.status === 'implemented') {
      const hasSchemaFixtures = c.schemaFixtures && c.schemaFixtures.length > 0;
      const hasOperationalTests = c.operationalTests && c.operationalTests.length > 0;
      
      if (c.authoritativeLayer === 'schema' && (!hasSchemaFixtures || hasOperationalTests)) {
        throw new Error(`Schema authoritative constraint ${c.id} must have schemaFixtures and no operationalTests`);
      }
      if (c.authoritativeLayer === 'operational' && (!hasOperationalTests || hasSchemaFixtures)) {
        throw new Error(`Operational authoritative constraint ${c.id} must have operationalTests and no schemaFixtures`);
      }
      if (c.authoritativeLayer === 'both' && (!hasSchemaFixtures || !hasOperationalTests)) {
        throw new Error(`Constraint ${c.id} with authoritativeLayer='both' must have both schemaFixtures and operationalTests`);
      }
    } else if (c.status === 'deferred') {
      if ((c.schemaFixtures && c.schemaFixtures.length > 0) || (c.operationalTests && c.operationalTests.length > 0)) {
        throw new Error(`Deferred constraint ${c.id} must not have fixtures or operational tests`);
      }
    }

    if (c.status === 'deferred' && c.description.toLowerCase().includes('implemented')) {
      throw new Error(`Deferred constraint must not claim implementation: ${c.id}`);
    }
    if (c.authoritativeLayer === 'schema') {
      if (!c.schemaPointer) throw new Error(`Schema authoritative constraint missing pointer: ${c.id}`);
      resolveJsonPointer(schema, c.schemaPointer);
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

  // Ensure matrix is up to date (Read-only)
  const currentMatrix = fs.readFileSync(matrixPath, 'utf8');
  const expectedMatrix = generateMatrix();
  if (currentMatrix !== expectedMatrix) {
    throw new Error('Constraint matrix is not up to date with constraints JSON. Run generator script manually.');
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
