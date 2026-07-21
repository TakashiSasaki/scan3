const fs = require('fs');
const path = require('path');

function validateFixtureCatalog() {
  const catalogPath = path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json');
  const expectations = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  if (!Array.isArray(expectations)) throw new Error('Fixture catalog must be an array');

  const names = new Set();
  for (const exp of expectations) {
    if (!exp.fixture || typeof exp.fixture !== 'string') throw new Error('Fixture name must be non-empty string');
    if (names.has(exp.fixture)) throw new Error(`Duplicate fixture name: ${exp.fixture}`);
    names.add(exp.fixture);

    if (!['PASS', 'FAIL', 'SKIP_ALLOWED'].includes(exp.schemaExpected)) throw new Error(`Invalid schemaExpected: ${exp.schemaExpected}`);
    if (!['PASS', 'FAIL', 'SKIP_ALLOWED'].includes(exp.operationalExpected)) throw new Error(`Invalid operationalExpected: ${exp.operationalExpected}`);

    if (!exp.reason || typeof exp.reason !== 'string') throw new Error('Reason must be non-empty string');

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

function validateConstraintRegistry() {
  const constraintsPath = path.join(__dirname, '../reconstruction/source-packet-constraints.json');
  const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));
  const schemaObj = JSON.parse(fs.readFileSync(path.join(__dirname, '../reconstruction/source-packet.schema.json'), 'utf8'));
  
  const expectations = JSON.parse(fs.readFileSync(path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json'), 'utf8'));
  const validFixtures = new Set(expectations.map(e => e.fixture));
  // Include dynamic tests
  validFixtures.add('symbolic-link-test');
  validFixtures.add('invalid-payload-root-not-directory');

  const ids = new Set();
  for (const c of constraints) {
    if (!c.id) throw new Error('Constraint ID is required');
    if (ids.has(c.id)) throw new Error(`Duplicate constraint ID: ${c.id}`);
    ids.add(c.id);

    if (!['schema', 'operational', 'both', 'deferred'].includes(c.authoritativeLayer)) {
      throw new Error(`Invalid authoritativeLayer: ${c.authoritativeLayer}`);
    }
    if (!['implemented', 'deferred'].includes(c.status)) {
      throw new Error(`Invalid status: ${c.status}`);
    }

    if (c.schemaPointer) {
      resolveJsonPointer(schemaObj, c.schemaPointer);
    }

    if (c.operationalEvidence) {
      if (!c.operationalEvidence.file || !c.operationalEvidence.marker) {
        throw new Error(`Operational evidence missing file or marker in ${c.id}`);
      }
      const evFile = path.join(__dirname, '..', c.operationalEvidence.file);
      if (!fs.existsSync(evFile)) throw new Error(`Evidence file not found: ${c.operationalEvidence.file}`);
      const content = fs.readFileSync(evFile, 'utf8');
      if (!content.includes(c.operationalEvidence.marker)) {
        throw new Error(`Evidence marker '${c.operationalEvidence.marker}' not found in ${c.operationalEvidence.file}`);
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
  
  if (!Array.isArray(data.skills)) throw new Error('Skills must be an array');

  const names = new Set();
  const dirs = new Set();

  for (const skill of data.skills) {
    if (!skill.name || typeof skill.name !== 'string') throw new Error('Skill name must be non-empty string');
    if (!skill.directory || typeof skill.directory !== 'string') throw new Error('Skill directory must be non-empty string');
    
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
  validateConstraintRegistry();
  validateSkillRegistry();
  console.log("Control registries validation passed.");
} catch (e) {
  console.error("Control registries validation failed:");
  console.error(e.message);
  process.exit(1);
}
