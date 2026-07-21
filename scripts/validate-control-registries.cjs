const fs = require('fs');
const path = require('path');
const { VALID_OPERATIONAL_ERROR_CODES } = require('./lib/operational-error-codes.cjs');

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertTrimmedNonEmptyString(val, fieldName, context) {
  if (typeof val !== 'string' || val.trim() === '' || val !== val.trim()) {
    throw new Error(`Field "${fieldName}" in ${context} must be a non-empty trimmed string (got: ${JSON.stringify(val)})`);
  }
}

function assertTrimmedStringOrEmpty(val, fieldName, context) {
  if (typeof val !== 'string' || val !== val.trim()) {
    throw new Error(`Field "${fieldName}" in ${context} must be a trimmed string (got: ${JSON.stringify(val)})`);
  }
}

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
    if (exp === null || typeof exp !== 'object' || Array.isArray(exp)) {
      throw new Error('Fixture catalog entry must be a non-null plain object');
    }

    for (const key of Object.keys(exp)) {
      if (!allowedFields.has(key)) throw new Error(`Unknown field in fixture catalog: ${key} in ${exp.fixture}`);
    }

    assertTrimmedNonEmptyString(exp.fixture, 'fixture', 'fixture entry');
    if (names.has(exp.fixture)) throw new Error(`Duplicate fixture name: ${exp.fixture}`);
    names.add(exp.fixture);

    assertTrimmedNonEmptyString(exp.schemaExpected, 'schemaExpected', exp.fixture);
    assertTrimmedNonEmptyString(exp.operationalExpected, 'operationalExpected', exp.fixture);

    if (!Array.isArray(exp.constraintIds) || exp.constraintIds.length === 0) {
      throw new Error(`Fixture ${exp.fixture} must have a non-empty constraintIds array`);
    }
    const seenCIds = new Set();
    for (const cId of exp.constraintIds) {
      assertTrimmedNonEmptyString(cId, 'constraintId', exp.fixture);
      if (seenCIds.has(cId)) {
        throw new Error(`Duplicate constraintId "${cId}" in fixture ${exp.fixture}`);
      }
      seenCIds.add(cId);
    }

    // Enforce closed 3-state outcome state machine: PASS/PASS, PASS/FAIL, FAIL/NOT_APPLICABLE
    const pair = `${exp.schemaExpected}/${exp.operationalExpected}`;
    const forbiddenPassPass = ['reason', 'expectedErrorCode', 'expectedSchemaKeyword', 'expectedSchemaPath', 'expectedSchemaInstancePath', 'expectedSchemaParams'];
    const forbiddenPassFail = ['expectedSchemaKeyword', 'expectedSchemaPath', 'expectedSchemaInstancePath', 'expectedSchemaParams'];

    if (pair === 'PASS/PASS') {
      for (const field of forbiddenPassPass) {
        if (hasOwn(exp, field)) {
          throw new Error(`Fixture ${exp.fixture} (PASS/PASS) must NOT have property "${field}"`);
        }
      }
    } else if (pair === 'PASS/FAIL') {
      assertTrimmedNonEmptyString(exp.reason, 'reason', exp.fixture);
      assertTrimmedNonEmptyString(exp.expectedErrorCode, 'expectedErrorCode', exp.fixture);
      if (!VALID_OPERATIONAL_ERROR_CODES.has(exp.expectedErrorCode)) {
        throw new Error(`Fixture ${exp.fixture} specifies invalid or unregistered expectedErrorCode: ${exp.expectedErrorCode}`);
      }
      for (const field of forbiddenPassFail) {
        if (hasOwn(exp, field)) {
          throw new Error(`Fixture ${exp.fixture} (PASS/FAIL) must NOT have property "${field}"`);
        }
      }
    } else if (pair === 'FAIL/NOT_APPLICABLE') {
      assertTrimmedNonEmptyString(exp.reason, 'reason', exp.fixture);
      assertTrimmedNonEmptyString(exp.expectedSchemaKeyword, 'expectedSchemaKeyword', exp.fixture);
      assertTrimmedNonEmptyString(exp.expectedSchemaPath, 'expectedSchemaPath', exp.fixture);
      if (!exp.expectedSchemaPath.startsWith('/')) {
        throw new Error(`Fixture ${exp.fixture} expectedSchemaPath must begin with '/'`);
      }
      assertTrimmedStringOrEmpty(exp.expectedSchemaInstancePath, 'expectedSchemaInstancePath', exp.fixture);
      if (exp.expectedSchemaInstancePath !== '' && !exp.expectedSchemaInstancePath.startsWith('/')) {
        throw new Error(`Fixture ${exp.fixture} expectedSchemaInstancePath must be empty or begin with '/'`);
      }
      if (!hasOwn(exp, 'expectedSchemaParams') || exp.expectedSchemaParams === null || typeof exp.expectedSchemaParams !== 'object' || Array.isArray(exp.expectedSchemaParams)) {
        throw new Error(`Fixture ${exp.fixture} (FAIL/NOT_APPLICABLE) must have expectedSchemaParams as a non-null plain object`);
      }
      if (hasOwn(exp, 'expectedErrorCode')) {
        throw new Error(`Fixture ${exp.fixture} (FAIL/NOT_APPLICABLE) must NOT have property "expectedErrorCode"`);
      }
    } else {
      throw new Error(`Forbidden fixture outcome pair "${pair}" in ${exp.fixture}. Allowed pairs are PASS/PASS, PASS/FAIL, FAIL/NOT_APPLICABLE.`);
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

    assertTrimmedNonEmptyString(entry.name, 'name', 'dynamic test registry entry');
    if (names.has(entry.name)) {
      throw new Error(`Duplicate dynamic test name in registry: ${entry.name}`);
    }
    names.add(entry.name);

    if (!Array.isArray(entry.constraintIds) || entry.constraintIds.length === 0) {
      throw new Error(`Dynamic test ${entry.name} must have a non-empty constraintIds array`);
    }
    const seenCIds = new Set();
    for (const cId of entry.constraintIds) {
      assertTrimmedNonEmptyString(cId, 'constraintId', entry.name);
      if (seenCIds.has(cId)) {
        throw new Error(`Duplicate constraintId "${cId}" in dynamic test ${entry.name}`);
      }
      seenCIds.add(cId);
    }

    assertTrimmedNonEmptyString(entry.expectedErrorCode, 'expectedErrorCode', entry.name);
    if (!VALID_OPERATIONAL_ERROR_CODES.has(entry.expectedErrorCode)) {
      throw new Error(`Dynamic test ${entry.name} specifies invalid or unregistered expectedErrorCode: ${entry.expectedErrorCode}`);
    }

    if (typeof entry.environmentDependent !== 'boolean') {
      throw new Error(`Dynamic test expectation environmentDependent must be a boolean in ${entry.name}`);
    }

    if (!Array.isArray(entry.allowedSkipReasons)) {
      throw new Error(`Dynamic test expectation allowedSkipReasons must be an array in ${entry.name}`);
    }

    const reasons = new Set();
    for (const r of entry.allowedSkipReasons) {
      assertTrimmedNonEmptyString(r, 'allowedSkipReason', entry.name);
      if (reasons.has(r)) {
        throw new Error(`Duplicate allowedSkipReason "${r}" in dynamic test: ${entry.name}`);
      }
      reasons.add(r);
    }

    if (entry.environmentDependent === false) {
      if (entry.allowedSkipReasons.length > 0) {
        throw new Error(`allowedSkipReasons must be empty when environmentDependent is false for dynamic test: ${entry.name}`);
      }
    } else {
      if (entry.allowedSkipReasons.length === 0) {
        throw new Error(`allowedSkipReasons must be non-empty when environmentDependent is true for dynamic test: ${entry.name}`);
      }
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

function validateDirectTestRegistry() {
  const directPath = path.join(__dirname, '../reconstruction/source-packet-direct-test-expectations.json');
  if (!fs.existsSync(directPath)) {
    throw new Error('Direct test expectations registry file not found');
  }
  const registry = JSON.parse(fs.readFileSync(directPath, 'utf8'));

  if (!Array.isArray(registry)) {
    throw new Error('Direct test expectations registry must be a top-level array');
  }

  const suiteMap = new Map();
  const caseToSuiteMap = new Map();
  const allowedSuiteFields = new Set(['name', 'runner', 'constraintIds', 'cases']);
  const allowedCaseFields = new Set(['name', 'input', 'fieldName', 'expectedOutcome', 'expectedErrorCode']);

  for (const suite of registry) {
    if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) {
      throw new Error('Direct test suite entry must be a non-null object');
    }

    for (const key of Object.keys(suite)) {
      if (!allowedSuiteFields.has(key)) {
        throw new Error(`Unknown field in direct test suite: ${key}`);
      }
    }

    assertTrimmedNonEmptyString(suite.name, 'name', 'direct test suite');
    if (suiteMap.has(suite.name)) {
      throw new Error(`Duplicate suite name in direct test registry: ${suite.name}`);
    }

    assertTrimmedNonEmptyString(suite.runner, 'runner', suite.name);
    const runnerPath = path.join(__dirname, '..', suite.runner);
    if (!fs.existsSync(runnerPath)) {
      throw new Error(`Direct test runner file not found: ${suite.runner} for suite ${suite.name}`);
    }

    if (!Array.isArray(suite.constraintIds) || suite.constraintIds.length === 0) {
      throw new Error(`Direct test suite ${suite.name} must have a non-empty constraintIds array`);
    }
    const seenCIds = new Set();
    for (const cId of suite.constraintIds) {
      assertTrimmedNonEmptyString(cId, 'constraintId', suite.name);
      if (seenCIds.has(cId)) {
        throw new Error(`Duplicate constraintId "${cId}" in direct test suite ${suite.name}`);
      }
      seenCIds.add(cId);
    }

    if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
      throw new Error(`Direct test suite ${suite.name} must have non-empty cases array`);
    }

    const caseNamesInSuite = new Set();
    for (const c of suite.cases) {
      if (c === null || typeof c !== 'object' || Array.isArray(c)) {
        throw new Error(`Direct test case must be a non-null object in suite ${suite.name}`);
      }

      for (const key of Object.keys(c)) {
        if (!allowedCaseFields.has(key)) {
          throw new Error(`Unknown field in direct test case: ${key} in suite ${suite.name}`);
        }
      }

      assertTrimmedNonEmptyString(c.name, 'name', `direct test case in suite ${suite.name}`);
      if (caseNamesInSuite.has(c.name)) {
        throw new Error(`Duplicate case name "${c.name}" in direct test suite ${suite.name}`);
      }
      caseNamesInSuite.add(c.name);

      assertTrimmedNonEmptyString(c.fieldName, 'fieldName', c.name);
      assertTrimmedNonEmptyString(c.expectedOutcome, 'expectedOutcome', c.name);

      if (!['PASS', 'ERROR'].includes(c.expectedOutcome)) {
        throw new Error(`Invalid expectedOutcome "${c.expectedOutcome}" in direct test case ${c.name}`);
      }

      if (c.expectedOutcome === 'ERROR') {
        assertTrimmedNonEmptyString(c.expectedErrorCode, 'expectedErrorCode', c.name);
        if (!VALID_OPERATIONAL_ERROR_CODES.has(c.expectedErrorCode)) {
          throw new Error(`Direct test case ${c.name} specifies invalid or unregistered expectedErrorCode: ${c.expectedErrorCode}`);
        }
      } else {
        if (c.expectedErrorCode !== undefined && c.expectedErrorCode !== null) {
          throw new Error(`Passing direct test case ${c.name} must NOT have expectedErrorCode`);
        }
      }

      caseToSuiteMap.set(c.name, suite);
    }

    suiteMap.set(suite.name, suite);
  }

  return { suiteMap, caseToSuiteMap };
}

function validateOperationalErrorCodesReverseCrossCheck(constraints, expectations, dynamicExpectations, directSuiteMap) {
  for (const code of VALID_OPERATIONAL_ERROR_CODES) {
    const inStatic = expectations.some(e => e.expectedErrorCode === code);
    const inDynamic = dynamicExpectations.some(d => d.expectedErrorCode === code);
    let inDirect = false;
    for (const suite of directSuiteMap.values()) {
      if (suite.cases.some(c => c.expectedErrorCode === code)) {
        inDirect = true;
        break;
      }
    }

    if (!inStatic && !inDynamic && !inDirect) {
      throw new Error(`Operational error code [${code}] is not tested by any fixture, dynamic test, or direct test`);
    }

    const inConstraints = constraints.some(c => c.status === 'implemented' && c.operationalEvidence && c.operationalEvidence.marker === code);
    if (!inConstraints) {
      throw new Error(`Operational error code [${code}] is not associated as operationalEvidence.marker in any implemented operational constraint`);
    }
  }
}

function validateConstraintRegistry(staticFixtureNames, dynamicTestNames, directSuiteMap) {
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

  validateOperationalErrorCodesReverseCrossCheck(constraints, expectations, dynamicExpectations, directSuiteMap);

  const directSuiteNames = new Set(directSuiteMap.keys());
  const validFixturesAndTests = new Set([...staticFixtureNames, ...dynamicTestNames, ...directSuiteNames]);

  const referencedSchemaFixtures = new Set();
  const referencedOperationalTests = new Set();

  const constraintMap = new Map();
  for (const c of constraints) {
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      throw new Error('Constraint entry must be a non-null object');
    }

    assertTrimmedNonEmptyString(c.id, 'id', 'constraint entry');
    if (constraintMap.has(c.id)) throw new Error(`Duplicate constraint ID: ${c.id}`);
    constraintMap.set(c.id, c);

    assertTrimmedNonEmptyString(c.description, 'description', c.id);
    assertTrimmedNonEmptyString(c.authoritativeLayer, 'authoritativeLayer', c.id);
    assertTrimmedNonEmptyString(c.status, 'status', c.id);

    const allowedFields = new Set(['id', 'description', 'authoritativeLayer', 'schemaPointer', 'schemaErrorPaths', 'operationalEvidence', 'schemaFixtures', 'operationalTests', 'status']);
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

    if (c.schemaErrorPaths !== null && c.schemaErrorPaths !== undefined) {
      if (!Array.isArray(c.schemaErrorPaths) || c.schemaErrorPaths.length === 0) {
        throw new Error(`schemaErrorPaths must be a non-empty array when present in constraint ${c.id}`);
      }
      const seenPaths = new Set();
      for (const p of c.schemaErrorPaths) {
        assertTrimmedNonEmptyString(p, 'schemaErrorPath', c.id);
        if (!p.startsWith('/')) {
          throw new Error(`schemaErrorPath in constraint ${c.id} must begin with '/': "${p}"`);
        }
        if (seenPaths.has(p)) {
          throw new Error(`Duplicate schemaErrorPath "${p}" in constraint ${c.id}`);
        }
        seenPaths.add(p);
      }
    }

    if (c.authoritativeLayer === 'schema') {
      if (!c.schemaPointer) throw new Error(`schema constraint must have schemaPointer in ${c.id}`);
      if (!Array.isArray(c.schemaErrorPaths) || c.schemaErrorPaths.length === 0) {
        throw new Error(`schema constraint must have non-empty schemaErrorPaths array in ${c.id}`);
      }
      if (c.operationalEvidence !== null) throw new Error(`schema constraint must NOT have operationalEvidence in ${c.id}`);
      if (c.status === 'implemented' && (c.schemaFixtures.length === 0 || c.operationalTests.length > 0)) {
        throw new Error(`schema constraint ${c.id} must have schemaFixtures and empty operationalTests`);
      }
    }
    if (c.authoritativeLayer === 'operational') {
      if (!c.operationalEvidence) throw new Error(`operational constraint must have operationalEvidence in ${c.id}`);
      if (c.schemaPointer !== null) throw new Error(`operational constraint must NOT have schemaPointer in ${c.id}`);
      if (c.schemaErrorPaths !== null) throw new Error(`operational constraint must NOT have schemaErrorPaths in ${c.id}`);
      if (c.status === 'implemented' && (c.operationalTests.length === 0 || c.schemaFixtures.length > 0)) {
        throw new Error(`operational constraint ${c.id} must have operationalTests and empty schemaFixtures`);
      }
    }
    if (c.authoritativeLayer === 'both') {
      if (!c.schemaPointer || !Array.isArray(c.schemaErrorPaths) || c.schemaErrorPaths.length === 0 || !c.operationalEvidence) {
        throw new Error(`both constraint must have schemaPointer, schemaErrorPaths, and operationalEvidence in ${c.id}`);
      }
      if (c.status === 'implemented' && (c.schemaFixtures.length === 0 || c.operationalTests.length === 0)) {
        throw new Error(`both constraint ${c.id} must have both schemaFixtures and operationalTests`);
      }
    }
    if (c.authoritativeLayer === 'deferred') {
      if (c.schemaPointer !== null || c.schemaErrorPaths !== null || c.operationalEvidence !== null) {
        throw new Error(`deferred constraint must NOT have schemaPointer, schemaErrorPaths, or operationalEvidence in ${c.id}`);
      }
      if (c.schemaFixtures.length > 0 || c.operationalTests.length > 0) {
        throw new Error(`deferred constraint ${c.id} must have empty fixtures`);
      }
      if (!['deferred', 'not-implemented'].includes(c.status)) {
        throw new Error(`deferred constraint status must be deferred or not-implemented in ${c.id}`);
      }
    }

    if (c.schemaPointer) {
      assertTrimmedNonEmptyString(c.schemaPointer, 'schemaPointer', c.id);
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

      assertTrimmedNonEmptyString(c.operationalEvidence.file, 'operationalEvidence.file', c.id);
      assertTrimmedNonEmptyString(c.operationalEvidence.marker, 'operationalEvidence.marker', c.id);

      const evFile = path.join(__dirname, '..', c.operationalEvidence.file);
      if (!fs.existsSync(evFile)) throw new Error(`Evidence file not found: ${c.operationalEvidence.file}`);
      const content = fs.readFileSync(evFile, 'utf8');
      if (!content.includes(c.operationalEvidence.marker)) {
        throw new Error(`Evidence marker '${c.operationalEvidence.marker}' not found in ${c.operationalEvidence.file}`);
      }
    }

    // Validate schemaFixtures
    for (const f of c.schemaFixtures) {
      assertTrimmedNonEmptyString(f, 'schemaFixture', c.id);
      if (!staticFixtureNames.has(f)) throw new Error(`schemaFixture ${f} in ${c.id} not found in static catalog`);
      referencedSchemaFixtures.add(f);

      // Check exact schema error path alignment with fixture's expectedSchemaPath
      if (c.schemaErrorPaths) {
        const staticExp = staticExpectationsMap.get(f);
        if (staticExp && staticExp.schemaExpected === 'FAIL' && staticExp.expectedSchemaPath) {
          const isMatch = c.schemaErrorPaths.includes(staticExp.expectedSchemaPath);
          if (!isMatch) {
            throw new Error(`Mismatched expectedSchemaPath "${staticExp.expectedSchemaPath}" in fixture "${f}" vs schemaErrorPaths [${c.schemaErrorPaths.join(', ')}] in constraint ${c.id}`);
          }
        }
      }
    }

    // Validate operationalTests
    for (const t of c.operationalTests) {
      assertTrimmedNonEmptyString(t, 'operationalTest', c.id);
      if (!validFixturesAndTests.has(t)) throw new Error(`operationalTest ${t} in ${c.id} not found in catalog, dynamic tests, or direct tests`);
      referencedOperationalTests.add(t);

      if (c.operationalEvidence) {
        const staticExp = staticExpectationsMap.get(t);
        const dynamicExp = dynamicExpectationsMap.get(t);
        const directSuite = directSuiteMap.get(t);
        let expCode = null;
        if (staticExp && staticExp.operationalExpected === 'FAIL') {
          expCode = staticExp.expectedErrorCode;
        } else if (dynamicExp) {
          expCode = dynamicExp.expectedErrorCode;
        } else if (directSuite) {
          expCode = c.operationalEvidence.marker;
        }

        if (expCode && expCode !== c.operationalEvidence.marker) {
          throw new Error(`Mismatched expectedErrorCode [${expCode}] in test "${t}" vs operational marker [${c.operationalEvidence.marker}] in constraint ${c.id}`);
        }
      }
    }
  }

  // Bidirectional cross-checks
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
  for (const suite of directSuiteMap.values()) {
    for (const cId of suite.constraintIds) {
      const c = constraintMap.get(cId);
      if (!c) {
        throw new Error(`Direct test suite ${suite.name} references non-existent constraintId "${cId}"`);
      }
      if (!c.operationalTests.includes(suite.name)) {
        throw new Error(`Direct test suite ${suite.name} lists constraintId "${cId}", but constraint "${cId}" does not list "${suite.name}" in operationalTests`);
      }
    }
  }

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
      const directSuite = directSuiteMap.get(t);
      const cIds = staticExp ? staticExp.constraintIds : (dynamicExp ? dynamicExp.constraintIds : (directSuite ? directSuite.constraintIds : []));
      if (!cIds.includes(c.id)) {
        throw new Error(`Constraint "${c.id}" lists operationalTest "${t}", but test "${t}" does not list "${c.id}" in constraintIds`);
      }
    }
  }

  // Reverse cross-check
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
  for (const name of directSuiteNames) {
    if (!referencedOperationalTests.has(name)) {
      throw new Error(`Direct test suite "${name}" is not referenced by any constraint in operationalTests`);
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
    assertTrimmedNonEmptyString(skill.name, 'name', 'skill entry');
    assertTrimmedNonEmptyString(skill.directory, 'directory', 'skill entry');
    
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
  const { suiteMap } = validateDirectTestRegistry();
  validateConstraintRegistry(staticNames, dynamicNames, suiteMap);
  validateSkillRegistry();
  console.log("Control registries validation passed.");
} catch (e) {
  console.error("Control registries validation failed:");
  console.error(e.message);
  process.exit(1);
}
