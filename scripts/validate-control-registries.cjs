const fs = require('fs');
const path = require('path');
const { VALID_OPERATIONAL_ERROR_CODES } = require('./lib/operational-error-codes.cjs');

function validateFixtureCatalog() {
  const catalogPath = path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json');
  const expectations = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  if (!Array.isArray(expectations)) throw new Error('Fixture catalog must be an array');

  const names = new Set();
  const allowedFields = new Set([
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
    if (!exp.fixture || typeof exp.fixture !== 'string' || exp.fixture.trim() === '') throw new Error('Fixture name must be non-empty string');
    if (names.has(exp.fixture)) throw new Error(`Duplicate fixture name: ${exp.fixture}`);
    names.add(exp.fixture);

    if (!['PASS', 'FAIL', 'SKIP_ALLOWED'].includes(exp.schemaExpected)) throw new Error(`Invalid schemaExpected: ${exp.schemaExpected} in ${exp.fixture}`);
    if (!['PASS', 'FAIL', 'SKIP_ALLOWED'].includes(exp.operationalExpected)) throw new Error(`Invalid operationalExpected: ${exp.operationalExpected} in ${exp.fixture}`);

    if (!Array.isArray(exp.constraintIds) || exp.constraintIds.length === 0) {
      throw new Error(`Fixture ${exp.fixture} must have a non-empty constraintIds array`);
    }
    for (const cId of exp.constraintIds) {
      if (typeof cId !== 'string' || cId.trim() === '') {
        throw new Error(`Invalid constraintId in ${exp.fixture}: ${cId}`);
      }
    }

    for (const key of Object.keys(exp)) {
      if (!allowedFields.has(key)) throw new Error(`Unknown field in fixture catalog: ${key} in ${exp.fixture}`);
    }

    // State-dependent contract validation
    if (exp.schemaExpected === 'FAIL') {
      if (!exp.expectedSchemaKeyword || typeof exp.expectedSchemaKeyword !== 'string' || exp.expectedSchemaKeyword.trim() === '') {
        throw new Error(`Fixture ${exp.fixture} with schemaExpected=FAIL must have expectedSchemaKeyword`);
      }
      if (!exp.expectedSchemaPath || typeof exp.expectedSchemaPath !== 'string' || exp.expectedSchemaPath.trim() === '') {
        throw new Error(`Fixture ${exp.fixture} with schemaExpected=FAIL must have expectedSchemaPath`);
      }
      if (exp.expectedErrorCode !== undefined) {
        throw new Error(`Fixture ${exp.fixture} with schemaExpected=FAIL must NOT have expectedErrorCode`);
      }
    } else if (exp.schemaExpected === 'PASS' && exp.operationalExpected === 'FAIL') {
      if (!exp.expectedErrorCode || typeof exp.expectedErrorCode !== 'string' || exp.expectedErrorCode.trim() === '') {
        throw new Error(`Fixture ${exp.fixture} with schemaExpected=PASS and operationalExpected=FAIL must have expectedErrorCode`);
      }
      if (!VALID_OPERATIONAL_ERROR_CODES.has(exp.expectedErrorCode)) {
        throw new Error(`Fixture ${exp.fixture} specifies invalid or unregistered expectedErrorCode: ${exp.expectedErrorCode}`);
      }
      if (exp.expectedSchemaKeyword !== undefined || exp.expectedSchemaPath !== undefined || exp.expectedSchemaInstancePath !== undefined || exp.expectedSchemaParams !== undefined) {
        throw new Error(`Fixture ${exp.fixture} with schemaExpected=PASS must NOT have schema failure fields`);
      }
    } else if (exp.schemaExpected === 'PASS' && exp.operationalExpected === 'PASS') {
      if (exp.expectedErrorCode !== undefined || exp.expectedSchemaKeyword !== undefined || exp.expectedSchemaPath !== undefined || exp.expectedSchemaInstancePath !== undefined || exp.expectedSchemaParams !== undefined) {
        throw new Error(`Passing fixture ${exp.fixture} must NOT have failure evidence fields`);
      }
    } else if (exp.schemaExpected === 'SKIP_ALLOWED' || exp.operationalExpected === 'SKIP_ALLOWED') {
      if (!exp.reason || typeof exp.reason !== 'string' || exp.reason.trim() === '') {
        throw new Error(`SKIP_ALLOWED fixture ${exp.fixture} must have explicit reason`);
      }
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

  return names;
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
  const allowedFields = new Set(['name', 'expectedErrorCode', 'environmentDependent', 'allowedSkipReasons', 'constraintIds']);

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

    if (!Array.isArray(entry.constraintIds) || entry.constraintIds.length === 0) {
      throw new Error(`Dynamic test ${trimmedName} must have a non-empty constraintIds array`);
    }
    for (const cId of entry.constraintIds) {
      if (typeof cId !== 'string' || cId.trim() === '') {
        throw new Error(`Invalid constraintId in dynamic test ${trimmedName}: ${cId}`);
      }
    }

    if (typeof entry.expectedErrorCode !== 'string' || entry.expectedErrorCode.trim() === '') {
      throw new Error('Dynamic test expectation expectedErrorCode must be a non-empty string');
    }

    if (!VALID_OPERATIONAL_ERROR_CODES.has(entry.expectedErrorCode)) {
      throw new Error(`Dynamic test ${trimmedName} specifies invalid or unregistered expectedErrorCode: ${entry.expectedErrorCode}`);
    }

    if (typeof entry.environmentDependent !== 'boolean') {
      throw new Error('Dynamic test expectation environmentDependent must be a boolean');
    }

    if (!Array.isArray(entry.allowedSkipReasons)) {
      throw new Error('Dynamic test expectation allowedSkipReasons must be an array');
    }

    const reasons = new Set();
    for (const r of entry.allowedSkipReasons) {
      if (typeof r !== 'string' || r.trim() === '') {
        throw new Error(`Dynamic test expectation allowedSkipReason must be a non-empty trimmed string in: ${trimmedName}`);
      }
      const trimmedReason = r.trim();
      if (reasons.has(trimmedReason)) {
        throw new Error(`Duplicate allowedSkipReason "${trimmedReason}" in dynamic test: ${trimmedName}`);
      }
      reasons.add(trimmedReason);
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

function validateOperationalErrorCodesReverseCrossCheck(constraints, expectations, dynamicExpectations) {
  const validatorFile = path.join(__dirname, 'validate-source-packet.cjs');
  const validatorContent = fs.readFileSync(validatorFile, 'utf8');

  for (const code of VALID_OPERATIONAL_ERROR_CODES) {
    // 1. Verify code is emitted/referenced in scripts/validate-source-packet.cjs
    if (!validatorContent.includes(code)) {
      throw new Error(`Operational error code [${code}] is not referenced in scripts/validate-source-packet.cjs`);
    }

    // 2. Verify at least one dynamic test or static fixture has expectedErrorCode === code
    const inStatic = expectations.some(e => e.expectedErrorCode === code);
    const inDynamic = dynamicExpectations.some(d => d.expectedErrorCode === code);
    if (!inStatic && !inDynamic) {
      throw new Error(`Operational error code [${code}] is not tested by any fixture or dynamic test expectation`);
    }

    // 3. Verify at least one constraint has operationalEvidence.marker === code
    const inConstraints = constraints.some(c => c.operationalEvidence && c.operationalEvidence.marker === code);
    if (!inConstraints) {
      throw new Error(`Operational error code [${code}] is not associated as operationalEvidence.marker in any constraint`);
    }
  }
}

function validateConstraintRegistry(staticFixtureNames, dynamicTestNames) {
  for (const staticName of staticFixtureNames) {
    if (dynamicTestNames.has(staticName)) {
      throw new Error(`Collision between static fixture and dynamic test name: ${staticName}`);
    }
  }

  const constraintsPath = path.join(__dirname, '../reconstruction/source-packet-constraints.json');
  const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));
  
  if (!Array.isArray(constraints)) throw new Error('Constraint registry must be a top-level array');

  const schemaObj = JSON.parse(fs.readFileSync(path.join(__dirname, '../reconstruction/source-packet.schema.json'), 'utf8'));
  
  const catalogPath = path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json');
  const expectations = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const staticExpectationsMap = new Map(expectations.map(e => [e.fixture, e]));
  
  const dynamicExpectationsPath = path.join(__dirname, '../reconstruction/source-packet-dynamic-test-expectations.json');
  const dynamicExpectations = JSON.parse(fs.readFileSync(dynamicExpectationsPath, 'utf8'));
  const dynamicExpectationsMap = new Map(dynamicExpectations.map(d => [d.name, d]));

  validateOperationalErrorCodesReverseCrossCheck(constraints, expectations, dynamicExpectations);

  const validFixtures = new Set([...staticFixtureNames, ...dynamicTestNames]);
  const referencedSchemaFixtures = new Set();
  const referencedOperationalTests = new Set();

  const constraintMap = new Map();
  for (const c of constraints) {
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      throw new Error('Constraint entry must be a non-null object');
    }

    if (!c.id || typeof c.id !== 'string' || c.id.trim() === '') throw new Error('Constraint ID must be a non-empty string');
    if (constraintMap.has(c.id)) throw new Error(`Duplicate constraint ID: ${c.id}`);
    constraintMap.set(c.id, c);

    if (!c.description || typeof c.description !== 'string' || c.description.trim() === '') {
      throw new Error(`Constraint description must be a non-empty string in ${c.id}`);
    }

    const allowedFields = new Set(['id', 'description', 'authoritativeLayer', 'schemaPointer', 'operationalEvidence', 'schemaFixtures', 'operationalTests', 'status']);
    for (const key of Object.keys(c)) {
      if (!allowedFields.has(key)) throw new Error(`Unknown field in constraint registry: ${key} in ${c.id}`);
    }

    if (!['schema', 'operational', 'both', 'deferred'].includes(c.authoritativeLayer)) {
      throw new Error(`Invalid authoritativeLayer: ${c.authoritativeLayer} in ${c.id}`);
    }
    if (!['implemented', 'deferred', 'not-implemented'].includes(c.status)) {
      throw new Error(`Invalid status: ${c.status} in ${c.id}`);
    }

    if (!Array.isArray(c.schemaFixtures)) {
      throw new Error(`schemaFixtures must be an array in ${c.id}`);
    }
    if (!Array.isArray(c.operationalTests)) {
      throw new Error(`operationalTests must be an array in ${c.id}`);
    }

    if (c.authoritativeLayer === 'schema') {
      if (!c.schemaPointer) throw new Error(`schema constraint must have schemaPointer in ${c.id}`);
      if (c.operationalEvidence !== null) throw new Error(`schema constraint must NOT have operationalEvidence in ${c.id}`);
      if (c.status === 'implemented' && (c.schemaFixtures.length === 0 || c.operationalTests.length > 0)) {
        throw new Error(`schema constraint ${c.id} must have schemaFixtures and empty operationalTests`);
      }
    }
    if (c.authoritativeLayer === 'operational') {
      if (!c.operationalEvidence) throw new Error(`operational constraint must have operationalEvidence in ${c.id}`);
      if (c.schemaPointer !== null) throw new Error(`operational constraint must NOT have schemaPointer in ${c.id}`);
      if (c.status === 'implemented' && (c.operationalTests.length === 0 || c.schemaFixtures.length > 0)) {
        throw new Error(`operational constraint ${c.id} must have operationalTests and empty schemaFixtures`);
      }
    }
    if (c.authoritativeLayer === 'both') {
      if (!c.schemaPointer || !c.operationalEvidence) throw new Error(`both constraint must have schemaPointer and operationalEvidence in ${c.id}`);
      if (c.status === 'implemented' && (c.schemaFixtures.length === 0 || c.operationalTests.length === 0)) {
        throw new Error(`both constraint ${c.id} must have both schemaFixtures and operationalTests`);
      }
    }
    if (c.authoritativeLayer === 'deferred') {
      if (c.schemaPointer !== null || c.operationalEvidence !== null) {
        throw new Error(`deferred constraint must NOT have schemaPointer or operationalEvidence in ${c.id}`);
      }
      if (c.schemaFixtures.length > 0 || c.operationalTests.length > 0) {
        throw new Error(`deferred constraint ${c.id} must have empty fixtures`);
      }
      if (!['deferred', 'not-implemented'].includes(c.status)) {
        throw new Error(`deferred constraint status must be deferred or not-implemented in ${c.id}`);
      }
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

    // Validate schemaFixtures
    for (const f of c.schemaFixtures) {
      if (!staticFixtureNames.has(f)) throw new Error(`schemaFixture ${f} in ${c.id} not found in static catalog`);
      referencedSchemaFixtures.add(f);

      // Check exact schema pointer alignment with fixture's expectedSchemaPath
      if (c.schemaPointer) {
        const staticExp = staticExpectationsMap.get(f);
        if (staticExp && staticExp.schemaExpected === 'FAIL' && staticExp.expectedSchemaPath) {
          const isMatch = (staticExp.expectedSchemaPath === c.schemaPointer) || c.schemaPointer.endsWith(staticExp.expectedSchemaPath);
          if (!isMatch) {
            throw new Error(`Mismatched expectedSchemaPath "${staticExp.expectedSchemaPath}" in fixture "${f}" vs schemaPointer "${c.schemaPointer}" in constraint ${c.id}`);
          }
        }
      }
    }

    // Validate operationalTests
    for (const t of c.operationalTests) {
      if (!validFixtures.has(t)) throw new Error(`operationalTest ${t} in ${c.id} not found in catalog or dynamic tests`);
      referencedOperationalTests.add(t);

      if (c.operationalEvidence) {
        const staticExp = staticExpectationsMap.get(t);
        const dynamicExp = dynamicExpectationsMap.get(t);
        let expCode = null;
        if (staticExp && staticExp.operationalExpected === 'FAIL') {
          expCode = staticExp.expectedErrorCode;
        } else if (dynamicExp) {
          expCode = dynamicExp.expectedErrorCode;
        }
        if (expCode && expCode !== c.operationalEvidence.marker) {
          throw new Error(`Mismatched expectedErrorCode [${expCode}] in test "${t}" vs operational marker [${c.operationalEvidence.marker}] in constraint ${c.id}`);
        }
      }
    }
  }

  // Bidirectional cross-check 1: Every fixture/test's constraintIds must exist and match constraint schemaFixtures/operationalTests
  for (const exp of expectations) {
    for (const cId of exp.constraintIds) {
      const c = constraintMap.get(cId);
      if (!c) {
        throw new Error(`Fixture ${exp.fixture} references non-existent constraintId "${cId}"`);
      }
      const isListed = c.schemaFixtures.includes(exp.fixture) || c.operationalTests.includes(exp.fixture);
      if (!isListed) {
        throw new Error(`Fixture ${exp.fixture} lists constraintId "${cId}", but constraint "${cId}" does not list "${exp.fixture}"`);
      }
    }
  }
  for (const exp of dynamicExpectations) {
    for (const cId of exp.constraintIds) {
      const c = constraintMap.get(cId);
      if (!c) {
        throw new Error(`Dynamic test ${exp.name} references non-existent constraintId "${cId}"`);
      }
      if (!c.operationalTests.includes(exp.name)) {
        throw new Error(`Dynamic test ${exp.name} lists constraintId "${cId}", but constraint "${cId}" does not list "${exp.name}" in operationalTests`);
      }
    }
  }

  // Bidirectional cross-check 2: Every constraint's schemaFixtures and operationalTests must list the constraint ID in their constraintIds
  for (const c of constraints) {
    for (const f of c.schemaFixtures) {
      const staticExp = staticExpectationsMap.get(f);
      if (!staticExp || !staticExp.constraintIds.includes(c.id)) {
        throw new Error(`Constraint "${c.id}" lists schemaFixture "${f}", but fixture "${f}" does not list "${c.id}" in constraintIds`);
      }
    }
    for (const t of c.operationalTests) {
      const staticExp = staticExpectationsMap.get(t);
      const dynamicExp = dynamicExpectationsMap.get(t);
      const cIds = staticExp ? staticExp.constraintIds : (dynamicExp ? dynamicExp.constraintIds : []);
      if (!cIds.includes(c.id)) {
        throw new Error(`Constraint "${c.id}" lists operationalTest "${t}", but test "${t}" does not list "${c.id}" in constraintIds`);
      }
    }
  }

  // Strict separation: No schema fixture in operationalTests and vice versa
  for (const c of constraints) {
    for (const f of c.schemaFixtures) {
      if (referencedOperationalTests.has(f) && staticExpectationsMap.get(f) && staticExpectationsMap.get(f).schemaExpected === 'FAIL') {
        throw new Error(`Schema failure fixture "${f}" must not be used as operational test`);
      }
    }
  }

  // Reverse cross-check: verify all static catalog fixtures and dynamic tests are referenced in constraints
  for (const name of staticFixtureNames) {
    if (!referencedSchemaFixtures.has(name) && !referencedOperationalTests.has(name)) {
      throw new Error(`Static catalog fixture "${name}" is not referenced by any constraint in schemaFixtures or operationalTests`);
    }
  }
  for (const name of dynamicTestNames) {
    if (!referencedOperationalTests.has(name)) {
      throw new Error(`Dynamic test "${name}" is not referenced by any constraint in operationalTests`);
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
  const staticNames = validateFixtureCatalog();
  const dynamicNames = validateDynamicTestRegistry();
  validateConstraintRegistry(staticNames, dynamicNames);
  validateSkillRegistry();
  console.log("Control registries validation passed.");
} catch (e) {
  console.error("Control registries validation failed:");
  console.error(e.message);
  process.exit(1);
}
