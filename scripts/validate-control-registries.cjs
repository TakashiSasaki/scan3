const fs = require('fs');
const path = require('path');

function validateFixtureCatalog() {
  const catalogPath = path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json');
  const expectations = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  if (!Array.isArray(expectations)) throw new Error('Fixture catalog must be an array');

  const names = new Set();
  for (const exp of expectations) {
    if (!exp.fixture || typeof exp.fixture !== 'string' || exp.fixture.trim() === '') throw new Error('Fixture name must be non-empty string');
    if (names.has(exp.fixture)) throw new Error(`Duplicate fixture name: ${exp.fixture}`);
    names.add(exp.fixture);

    if (!['PASS', 'FAIL', 'SKIP_ALLOWED'].includes(exp.schemaExpected)) throw new Error(`Invalid schemaExpected: ${exp.schemaExpected}`);
    if (!['PASS', 'FAIL', 'SKIP_ALLOWED'].includes(exp.operationalExpected)) throw new Error(`Invalid operationalExpected: ${exp.operationalExpected}`);

    if (!exp.reason || typeof exp.reason !== 'string' || exp.reason.trim() === '') throw new Error('Reason must be non-empty string');

    const allowedFields = new Set(['fixture', 'schemaExpected', 'operationalExpected', 'reason']);
    for (const key of Object.keys(exp)) {
      if (!allowedFields.has(key)) throw new Error(`Unknown field in fixture catalog: ${key}`);
    }
  }

  const examplesDir = path.join(__dirname, '../reconstruction/examples');
  const fixtureDirs = new Set(fs.readdirSync(examplesDir).filter(name => fs.statSync(path.join(examplesDir, name)).isDirectory()));

  for (const name of names) {
    if (!fixtureDirs.has(name)) throw new Error(`Catalog fixture missing from directory: ${name}`);
  }
  for (const name of fixtureDirs) {
    if (!names.has(name)) throw new Error(`Fixture directory missing from catalog: ${name}`);
  }
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

function validateDynamicTestRegistry() {
  const dynamicExpectationsPath = path.join(__dirname, '../reconstruction/source-packet-dynamic-test-expectations.json');
  if (!fs.existsSync(dynamicExpectationsPath)) {
    throw new Error('Dynamic test expectations registry file not found');
  }
  const dynamicExpectations = JSON.parse(fs.readFileSync(dynamicExpectationsPath, 'utf8'));

  if (!Array.isArray(dynamicExpectations)) {
    throw new Error('Dynamic test expectations registry must be a top-level array');
  }

  const names = new Set();
  const allowedFields = new Set(['name', 'expectedErrorCode', 'environmentDependent', 'allowedSkipReasons']);

  for (const entry of dynamicExpectations) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('Dynamic test expectations entry must be a non-null object');
    }

    for (const key of Object.keys(entry)) {
      if (!allowedFields.has(key)) {
        throw new Error(`Unknown field in dynamic test registry: ${key}`);
      }
    }

    if (typeof entry.name !== 'string' || entry.name.trim() === '') {
      throw new Error('Dynamic test expectation name must be a non-empty string');
    }
    const trimmedName = entry.name.trim();
    if (names.has(trimmedName)) {
      throw new Error(`Duplicate dynamic test name in registry: ${trimmedName}`);
    }
    names.add(trimmedName);

    if (typeof entry.expectedErrorCode !== 'string' || entry.expectedErrorCode.trim() === '') {
      throw new Error('Dynamic test expectation expectedErrorCode must be a non-empty string');
    }

    if (typeof entry.environmentDependent !== 'boolean') {
      throw new Error('Dynamic test expectation environmentDependent must be a boolean');
    }

    if (!Array.isArray(entry.allowedSkipReasons)) {
      throw new Error('Dynamic test expectation allowedSkipReasons must be an array');
    }

    const reasons = new Set();
    for (const r of entry.allowedSkipReasons) {
      if (typeof r !== 'string') {
        throw new Error('Dynamic test expectation allowedSkipReason must be a string');
      }
      if (reasons.has(r)) {
        throw new Error(`Duplicate allowedSkipReason "${r}" in dynamic test: ${trimmedName}`);
      }
      reasons.add(r);
    }

    if (entry.environmentDependent === false && entry.allowedSkipReasons.length > 0) {
      throw new Error(`allowedSkipReasons must be empty when environmentDependent is false for dynamic test: ${trimmedName}`);
    }
  }

  const { dynamicTestSetups } = require('./test-source-packet-validator.cjs');
  const setupNames = new Set(Object.keys(dynamicTestSetups));

  for (const name of names) {
    if (!setupNames.has(name)) {
      throw new Error(`Dynamic test registry name "${name}" has no matching setup function in test runner`);
    }
  }
  for (const name of setupNames) {
    if (!names.has(name)) {
      throw new Error(`Test runner setup function "${name}" is not registered in dynamic test expectations registry`);
    }
  }

  return names;
}

function validateConstraintRegistry() {
  const constraintsPath = path.join(__dirname, '../reconstruction/source-packet-constraints.json');
  const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));
  
  if (!Array.isArray(constraints)) throw new Error('Constraint registry must be a top-level array');

  const schemaObj = JSON.parse(fs.readFileSync(path.join(__dirname, '../reconstruction/source-packet.schema.json'), 'utf8'));
  
  const expectations = JSON.parse(fs.readFileSync(path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json'), 'utf8'));
  const validFixtures = new Set(expectations.map(e => e.fixture));
  
  // Load dynamic test names from single source of truth
  const dynamicExpectationsPath = path.join(__dirname, '../reconstruction/source-packet-dynamic-test-expectations.json');
  const dynamicExpectations = JSON.parse(fs.readFileSync(dynamicExpectationsPath, 'utf8'));
  for (const d of dynamicExpectations) {
    validFixtures.add(d.name);
  }

  const ids = new Set();
  for (const c of constraints) {
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      throw new Error('Constraint entry must be a non-null object');
    }

    if (!c.id || typeof c.id !== 'string' || c.id.trim() === '') throw new Error('Constraint ID must be a non-empty string');
    if (ids.has(c.id)) throw new Error(`Duplicate constraint ID: ${c.id}`);
    ids.add(c.id);

    if (!c.description || typeof c.description !== 'string' || c.description.trim() === '') {
      throw new Error(`Constraint description must be a non-empty string in ${c.id}`);
    }

    const allowedFields = new Set(['id', 'description', 'authoritativeLayer', 'schemaPointer', 'operationalEvidence', 'fixtures', 'status']);
    for (const key of Object.keys(c)) {
      if (!allowedFields.has(key)) throw new Error(`Unknown field in constraint registry: ${key} in ${c.id}`);
    }

    if (!['schema', 'operational', 'both', 'deferred'].includes(c.authoritativeLayer)) {
      throw new Error(`Invalid authoritativeLayer: ${c.authoritativeLayer} in ${c.id}`);
    }
    if (!['implemented', 'deferred', 'not-implemented'].includes(c.status)) {
      throw new Error(`Invalid status: ${c.status} in ${c.id}`);
    }

    if (c.authoritativeLayer === 'schema' && !c.schemaPointer) {
      throw new Error(`schema constraint must have schemaPointer in ${c.id}`);
    }
    if (c.authoritativeLayer === 'operational' && !c.operationalEvidence) {
      throw new Error(`operational constraint must have operationalEvidence in ${c.id}`);
    }
    if (c.authoritativeLayer === 'both' && (!c.schemaPointer || !c.operationalEvidence)) {
      throw new Error(`both constraint must have schemaPointer and operationalEvidence in ${c.id}`);
    }
    if (c.authoritativeLayer === 'deferred' && !['deferred', 'not-implemented'].includes(c.status)) {
      throw new Error(`deferred constraint status must be deferred or not-implemented in ${c.id}`);
    }

    if (c.schemaPointer) {
      resolveJsonPointer(schemaObj, c.schemaPointer);
    }

    if (c.operationalEvidence) {
      if (typeof c.operationalEvidence !== 'object' || Array.isArray(c.operationalEvidence) || c.operationalEvidence === null) {
        throw new Error(`operationalEvidence must be an object in ${c.id}`);
      }
      
      const allowedEvidenceFields = new Set(['file', 'marker']);
      for (const k of Object.keys(c.operationalEvidence)) {
        if (!allowedEvidenceFields.has(k)) {
          throw new Error(`Unknown field in operationalEvidence: ${k} in ${c.id}`);
        }
      }

      if (!c.operationalEvidence.file || typeof c.operationalEvidence.file !== 'string' || c.operationalEvidence.file.trim() === '') {
        throw new Error(`operationalEvidence file must be a non-empty string in ${c.id}`);
      }
      if (!c.operationalEvidence.marker || typeof c.operationalEvidence.marker !== 'string' || c.operationalEvidence.marker.trim() === '') {
        throw new Error(`operationalEvidence marker must be a non-empty string in ${c.id}`);
      }

      const evFile = path.join(__dirname, '..', c.operationalEvidence.file.trim());
      if (!fs.existsSync(evFile)) throw new Error(`Evidence file not found: ${c.operationalEvidence.file}`);
      const content = fs.readFileSync(evFile, 'utf8');
      if (!content.includes(c.operationalEvidence.marker.trim())) {
        throw new Error(`Evidence marker '${c.operationalEvidence.marker}' not found in ${c.operationalEvidence.file}`);
      }
    }

    if (c.fixtures) {
      if (!Array.isArray(c.fixtures)) {
        throw new Error(`fixtures must be an array in ${c.id}`);
      }
      const seenFixturesInEntry = new Set();
      for (const f of c.fixtures) {
        if (typeof f !== 'string') {
          throw new Error(`fixture must be a string in ${c.id}`);
        }
        if (seenFixturesInEntry.has(f)) {
          throw new Error(`Duplicate fixture "${f}" in constraint ${c.id}`);
        }
        seenFixturesInEntry.add(f);
      }
    }

    if (c.status === 'implemented') {
      if (!c.fixtures || c.fixtures.length === 0) throw new Error(`Implemented constraint ${c.id} missing fixtures`);
      for (const f of c.fixtures) {
        if (!validFixtures.has(f)) throw new Error(`Fixture ${f} not found in catalog or dynamic tests for constraint ${c.id}`);
      }
      
      if (!c.schemaPointer && !c.operationalEvidence) {
        throw new Error(`Implemented constraint ${c.id} must have schemaPointer or operationalEvidence`);
      }
    }
  }
}

function validateSkillRegistry() {
  const skillsPath = path.join(__dirname, '../reconstruction/agent-skills.json');
  const data = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
  
  const rootKeys = Object.keys(data);
  if (rootKeys.length !== 1 || rootKeys[0] !== 'skills') {
    throw new Error('Skill registry must only contain a "skills" property');
  }

  if (!Array.isArray(data.skills)) throw new Error('Skills must be an array');

  const names = new Set();
  const dirs = new Set();

  for (const skill of data.skills) {
    if (!skill.name || typeof skill.name !== 'string' || skill.name.trim() === '') throw new Error('Skill name must be non-empty string');
    if (!skill.directory || typeof skill.directory !== 'string' || skill.directory.trim() === '') throw new Error('Skill directory must be non-empty string');
    
    if (names.has(skill.name)) throw new Error(`Duplicate skill name: ${skill.name}`);
    if (dirs.has(skill.directory)) throw new Error(`Duplicate skill directory: ${skill.directory}`);
    
    names.add(skill.name);
    dirs.add(skill.directory);

    const allowedFields = new Set(['name', 'directory']);
    for (const key of Object.keys(skill)) {
      if (!allowedFields.has(key)) throw new Error(`Unknown field in skill registry: ${key}`);
    }

    const dirPath = path.join(__dirname, '..', skill.directory);
    if (!fs.existsSync(dirPath)) throw new Error(`Skill directory not found: ${skill.directory}`);
    if (!fs.existsSync(path.join(dirPath, 'SKILL.md'))) throw new Error(`SKILL.md not found in ${skill.directory}`);
  }
}

try {
  validateFixtureCatalog();
  validateDynamicTestRegistry();
  validateConstraintRegistry();
  validateSkillRegistry();
  console.log("Control registries validation passed.");
} catch (e) {
  console.error("Control registries validation failed:");
  console.error(e.message);
  process.exit(1);
}
