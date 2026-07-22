const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { execFileSync } = require('child_process');
const { generateMatrix } = require('./generate-source-packet-constraint-matrix.cjs');
const { VALID_OPERATIONAL_ERROR_CODES } = require('./lib/operational-error-codes.cjs');

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

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
  const allowedFixtureKeys = new Set([
    'fixture',
    'schemaExpected',
    'operationalExpected',
    'reason',
    'expectedErrorCode',
    'expectedSchemaKeyword',
    'expectedSchemaPath',
    'expectedSchemaInstancePath',
    'expectedSchemaParams',
    'constraintIds'
  ]);

  for (const exp of expectations) {
    if (exp === null || typeof exp !== 'object' || Array.isArray(exp)) {
      throw new Error('Fixture expectation entry must be a non-null plain object');
    }

    for (const key of Object.keys(exp)) {
      if (!allowedFixtureKeys.has(key)) throw new Error(`Unknown key in fixture catalog: ${key} in ${exp.fixture}`);
    }

    if (typeof exp.fixture !== 'string' || exp.fixture.trim() === '' || exp.fixture !== exp.fixture.trim()) {
      throw new Error(`Fixture name must be a non-empty trimmed string`);
    }
    if (typeof exp.schemaExpected !== 'string' || exp.schemaExpected.trim() === '' || exp.schemaExpected !== exp.schemaExpected.trim()) {
      throw new Error(`Fixture ${exp.fixture} schemaExpected must be a non-empty trimmed string`);
    }
    if (typeof exp.operationalExpected !== 'string' || exp.operationalExpected.trim() === '' || exp.operationalExpected !== exp.operationalExpected.trim()) {
      throw new Error(`Fixture ${exp.fixture} operationalExpected must be a non-empty trimmed string`);
    }
    if (!Array.isArray(exp.constraintIds) || exp.constraintIds.length === 0) {
      throw new Error(`Fixture ${exp.fixture} constraintIds must be a non-empty array`);
    }
    const seenCIds = new Set();
    for (const cId of exp.constraintIds) {
      if (typeof cId !== 'string' || cId.trim() === '' || cId !== cId.trim()) {
        throw new Error(`Fixture ${exp.fixture} constraintId must be a non-empty trimmed string`);
      }
      if (seenCIds.has(cId)) {
        throw new Error(`Duplicate constraintId "${cId}" in fixture ${exp.fixture}`);
      }
      seenCIds.add(cId);
    }

    const pair = `${exp.schemaExpected}/${exp.operationalExpected}`;
    if (pair === "PASS/PASS") {
      const forbiddenPassPass = ['reason', 'expectedErrorCode', 'expectedSchemaKeyword', 'expectedSchemaPath', 'expectedSchemaInstancePath', 'expectedSchemaParams'];
      for (const field of forbiddenPassPass) {
        if (hasOwn(exp, field)) {
          throw new Error(`Fixture ${exp.fixture} (PASS/PASS) must NOT have property "${field}"`);
        }
      }
    } else if (pair === "PASS/FAIL") {
      if (!hasOwn(exp, 'reason') || typeof exp.reason !== 'string' || exp.reason.trim() === '' || exp.reason !== exp.reason.trim()) {
        throw new Error(`PASS/FAIL fixture ${exp.fixture} must have a non-empty trimmed string reason`);
      }
      if (!hasOwn(exp, 'expectedErrorCode') || typeof exp.expectedErrorCode !== 'string' || exp.expectedErrorCode.trim() === '' || exp.expectedErrorCode !== exp.expectedErrorCode.trim()) {
        throw new Error(`PASS/FAIL fixture ${exp.fixture} must have a non-empty trimmed string expectedErrorCode`);
      }
      if (!VALID_OPERATIONAL_ERROR_CODES.has(exp.expectedErrorCode)) {
        throw new Error(`Fixture ${exp.fixture} specifies invalid or unregistered expectedErrorCode: ${exp.expectedErrorCode}`);
      }
      const forbiddenPassFail = ['expectedSchemaKeyword', 'expectedSchemaPath', 'expectedSchemaInstancePath', 'expectedSchemaParams'];
      for (const field of forbiddenPassFail) {
        if (hasOwn(exp, field)) {
          throw new Error(`Fixture ${exp.fixture} (PASS/FAIL) must NOT have property "${field}"`);
        }
      }
    } else if (pair === "FAIL/NOT_APPLICABLE") {
      if (!hasOwn(exp, 'reason') || typeof exp.reason !== 'string' || exp.reason.trim() === '' || exp.reason !== exp.reason.trim()) {
        throw new Error(`FAIL/NOT_APPLICABLE fixture ${exp.fixture} must have a non-empty trimmed string reason`);
      }
      if (!hasOwn(exp, 'expectedSchemaKeyword') || typeof exp.expectedSchemaKeyword !== 'string' || exp.expectedSchemaKeyword.trim() === '' || exp.expectedSchemaKeyword !== exp.expectedSchemaKeyword.trim()) {
        throw new Error(`FAIL/NOT_APPLICABLE fixture ${exp.fixture} must have a non-empty trimmed string expectedSchemaKeyword`);
      }
      if (!hasOwn(exp, 'expectedSchemaPath') || typeof exp.expectedSchemaPath !== 'string' || exp.expectedSchemaPath.trim() === '' || exp.expectedSchemaPath !== exp.expectedSchemaPath.trim() || !exp.expectedSchemaPath.startsWith('/')) {
        throw new Error(`FAIL/NOT_APPLICABLE fixture ${exp.fixture} must have expectedSchemaPath starting with '/'`);
      }
      if (!hasOwn(exp, 'expectedSchemaInstancePath') || typeof exp.expectedSchemaInstancePath !== 'string' || exp.expectedSchemaInstancePath !== exp.expectedSchemaInstancePath.trim() || (exp.expectedSchemaInstancePath !== '' && !exp.expectedSchemaInstancePath.startsWith('/'))) {
        throw new Error(`FAIL/NOT_APPLICABLE fixture ${exp.fixture} must have expectedSchemaInstancePath as empty string or starting with '/'`);
      }
      if (!hasOwn(exp, 'expectedSchemaParams') || exp.expectedSchemaParams === null || typeof exp.expectedSchemaParams !== 'object' || Array.isArray(exp.expectedSchemaParams)) {
        throw new Error(`FAIL/NOT_APPLICABLE fixture ${exp.fixture} must have expectedSchemaParams as a non-null plain object`);
      }
      if (hasOwn(exp, 'expectedErrorCode')) {
        throw new Error(`FAIL/NOT_APPLICABLE fixture ${exp.fixture} must NOT have property "expectedErrorCode"`);
      }
    } else {
      throw new Error(`Forbidden fixture outcome pair "${pair}" in ${exp.fixture}. Allowed pairs are PASS/PASS, PASS/FAIL, FAIL/NOT_APPLICABLE.`);
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
