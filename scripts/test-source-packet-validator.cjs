const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { isCapabilityLimitedSymlinkError } = require('./lib/symlink-capability.cjs');

const defaultManifest = {
  "formatVersion": "1.0",
  "packetId": "dynamic-test",
  "purpose": "test",
  "source": { "repository": "TakashiSasaki/legacy", "commit": "0000000000000000000000000000000000000000" },
  "destination": { "repository": "TakashiSasaki/scan3", "baselineCommit": "0000000000000000000000000000000000000000" },
  "files": [],
  "ownerDecisions": []
};

function safeSymlink(target, linkPath, type) {
  try {
    fs.symlinkSync(target, linkPath, type);
  } catch (e) {
    if (isCapabilityLimitedSymlinkError(e)) {
      throw new Error("symlink creation not supported");
    }
    throw new Error(`Unexpected setup error during symlink creation [${e.code || 'UNKNOWN'}]: ${e.message}`);
  }
}

const dynamicTestSetups = {
  'invalid-payload-root-missing': (packetDir, payloadDir) => {
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  },
  'invalid-payload-root-not-directory': (packetDir, payloadDir) => {
    fs.writeFileSync(payloadDir, 'file not dir');
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  },
  'invalid-payload-root-symlink': (packetDir, payloadDir) => {
    const realDir = path.join(packetDir, 'real-root-target');
    fs.mkdirSync(realDir, { recursive: true });
    safeSymlink(realDir, payloadDir, 'dir');
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  },
  'invalid-payload-root-dangling-symlink': (packetDir, payloadDir) => {
    const nonExistentDir = path.join(packetDir, 'does-not-exist');
    safeSymlink(nonExistentDir, payloadDir, 'dir');
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  },
  'invalid-payload-file-missing': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "missing.txt",
      "payloadPath": "missing.txt",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "sizeBytes": 0,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-file-symlink-outside': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const outsideFile = path.join(packetDir, 'outside-target-file.txt');
    fs.writeFileSync(outsideFile, 'test');
    safeSymlink(outsideFile, path.join(payloadDir, 'outside.txt'));
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "outside.txt",
      "payloadPath": "outside.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-file-symlink-inside': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const insideFile = path.join(payloadDir, 'inside.txt');
    fs.writeFileSync(insideFile, 'test');
    safeSymlink(insideFile, path.join(payloadDir, 'link.txt'));
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "link.txt",
      "payloadPath": "link.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-file-dangling-symlink': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const nonExistentFile = path.join(payloadDir, 'does-not-exist.txt');
    safeSymlink(nonExistentFile, path.join(payloadDir, 'link.txt'));
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "link.txt",
      "payloadPath": "link.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-ancestor-symlink': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const realSubdir = path.join(payloadDir, 'real-sub');
    fs.mkdirSync(realSubdir);
    const insideFile = path.join(realSubdir, 'file.txt');
    fs.writeFileSync(insideFile, 'test');
    safeSymlink(realSubdir, path.join(payloadDir, 'link-sub'), 'dir');
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "link-sub/file.txt",
      "payloadPath": "link-sub/file.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-not-regular-file': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const subDir = path.join(payloadDir, 'subdir');
    fs.mkdirSync(subDir);
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "subdir",
      "payloadPath": "subdir",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "sizeBytes": 0,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-size-mismatch': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    fs.writeFileSync(path.join(payloadDir, 'file.txt'), 'test');
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "file.txt",
      "payloadPath": "file.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 999,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  },
  'invalid-payload-hash-mismatch': (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    fs.writeFileSync(path.join(payloadDir, 'file.txt'), 'test');
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "file.txt",
      "payloadPath": "file.txt",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  }
};

module.exports = { dynamicTestSetups };

if (require.main === module) {
  const isJson = process.argv.includes('--json');
  const validatorPath = path.join(__dirname, 'validate-source-packet.cjs');
  const examplesDir = path.join(__dirname, '../reconstruction/examples');
  const catalogPath = path.join(__dirname, '../reconstruction/source-packet-fixture-expectations.json');
  const expectations = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let notApplicable = 0;
  const results = [];

  function recordResult(name, kind, result, expectedErrorCode, actualErrorCode, reason) {
    results.push({
      name,
      kind,
      result,
      expectedErrorCode: expectedErrorCode || null,
      actualErrorCode: actualErrorCode || null,
      reason: reason || null
    });

    if (!isJson) {
      if (result === 'SKIP') {
        console.log(`SKIP: ${name} — ${reason}`);
      } else if (result === 'NOT_APPLICABLE') {
        console.log(`NOT_APPLICABLE: ${name} — ${reason}`);
      } else if (result === 'FAIL') {
        console.error(`FAIL: ${name}${reason ? ` (${reason})` : ''}`);
      } else {
        console.log(`PASS: ${name}`);
      }
    }
  }

  const fixtureDirs = new Set(fs.readdirSync(examplesDir).filter(name => fs.statSync(path.join(examplesDir, name)).isDirectory()));
  const expectedFixtures = new Set(expectations.map(exp => exp.fixture));

  for (const name of fixtureDirs) {
    if (!expectedFixtures.has(name)) {
      failed++;
      recordResult(name, 'static', 'FAIL', null, null, 'Fixture directory exists on filesystem but is missing from catalog');
    }
  }

  for (const exp of expectations) {
    if (!fixtureDirs.has(exp.fixture)) {
      failed++;
      recordResult(exp.fixture, 'static', 'FAIL', exp.expectedErrorCode || null, null, 'Fixture catalog entry exists but directory is missing from filesystem');
      continue;
    }
    
    const target = path.join(examplesDir, exp.fixture);
    const manifestPath = path.join(target, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      failed++;
      recordResult(exp.fixture, 'static', 'FAIL', exp.expectedErrorCode || null, null, 'manifest.json not found in fixture directory');
      continue;
    }

    if (exp.operationalExpected === 'NOT_APPLICABLE') {
      notApplicable++;
      recordResult(exp.fixture, 'static', 'NOT_APPLICABLE', null, null, exp.reason || 'Operational validation not reached for schema-invalid fixture');
      continue;
    }

    if (exp.operationalExpected === 'SKIP_ALLOWED') {
      skipped++;
      recordResult(exp.fixture, 'static', 'SKIP', exp.expectedErrorCode || null, null, exp.reason);
      continue;
    }

    let success = false;
    let stderr = '';
    try {
      execFileSync(process.execPath, [validatorPath, target], { stdio: 'pipe' });
      success = true;
    } catch (e) {
      success = false;
      stderr = e.stderr ? e.stderr.toString() : e.message;
    }
    
    const expectSuccess = exp.operationalExpected === 'PASS';
    let actualCode = null;
    if (!success && stderr) {
      const match = stderr.match(/\[([A-Z0-9_]+)\]/);
      if (match) actualCode = match[1];
    }

    let isCodeMatch = true;
    if (exp.expectedErrorCode) {
      isCodeMatch = actualCode === exp.expectedErrorCode;
    }

    if (success === expectSuccess && isCodeMatch) {
      passed++;
      recordResult(exp.fixture, 'static', 'PASS', exp.expectedErrorCode || null, actualCode, null);
    } else {
      failed++;
      recordResult(exp.fixture, 'static', 'FAIL', exp.expectedErrorCode || null, actualCode, `Expected success: ${expectSuccess}, expectedErrorCode: ${exp.expectedErrorCode || 'N/A'}, but got success: ${success}, actualCode: ${actualCode}. Output: ${stderr}`);
    }
  }

  if (!isJson) console.log('Running dynamic operational tests...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-operational-test-'));

  const dynamicExpectationsPath = path.join(__dirname, '../reconstruction/source-packet-dynamic-test-expectations.json');
  const dynamicExpectations = JSON.parse(fs.readFileSync(dynamicExpectationsPath, 'utf8'));

  const dynamicRegistryNames = new Set(dynamicExpectations.map(e => e.name));
  const dynamicSetupNames = new Set(Object.keys(dynamicTestSetups));

  for (const name of dynamicRegistryNames) {
    if (!dynamicSetupNames.has(name)) {
      console.error(`Error: test name "${name}" in dynamic test expectations registry has no matching setup function.`);
      process.exit(1);
    }
  }
  for (const name of dynamicSetupNames) {
    if (!dynamicRegistryNames.has(name)) {
      console.error(`Error: setup function "${name}" has no matching entry in dynamic test expectations registry.`);
      process.exit(1);
    }
  }

  try {
    for (const testDef of dynamicExpectations) {
      const { name, expectedErrorCode, environmentDependent, allowedSkipReasons } = testDef;
      const setupFn = dynamicTestSetups[name];
      
      const packetDir = path.join(tempDir, name);
      fs.mkdirSync(packetDir, { recursive: true });
      const payloadDir = path.join(packetDir, 'payload');
      
      let setupError = null;
      try {
        setupFn(packetDir, payloadDir);
      } catch (e) {
        setupError = e;
      }
      
      if (setupError) {
        let actualCode = null;
        if (setupError.code) {
          actualCode = setupError.code;
        } else if (setupError.message) {
          const match = setupError.message.match(/\[([A-Z0-9_]+)\]/);
          if (match) actualCode = match[1];
        }
        if (actualCode && actualCode === expectedErrorCode) {
          passed++;
          recordResult(name, 'dynamic', 'PASS', expectedErrorCode, actualCode, null);
          continue;
        }

        const isAllowedSkip = environmentDependent && allowedSkipReasons.includes(setupError.message);
        if (isAllowedSkip) {
          skipped++;
          recordResult(name, 'dynamic', 'SKIP', expectedErrorCode, actualCode, setupError.message);
        } else {
          failed++;
          recordResult(name, 'dynamic', 'FAIL', expectedErrorCode, actualCode, `Unexpected setup error: ${setupError.message}`);
        }
        continue;
      }
      
      let success = false;
      let stderr = '';
      try {
        execFileSync(process.execPath, [validatorPath, packetDir], { stdio: 'pipe' });
        success = true;
      } catch (e) {
        success = false;
        stderr = e.stderr ? e.stderr.toString() : e.message;
      }
      
      let actualCode = null;
      if (!success && stderr) {
        const match = stderr.match(/\[([A-Z0-9_]+)\]/);
        if (match) actualCode = match[1];
      }

      if (success === false && actualCode === expectedErrorCode) {
        passed++;
        recordResult(name, 'dynamic', 'PASS', expectedErrorCode, actualCode, null);
      } else {
        failed++;
        recordResult(name, 'dynamic', 'FAIL', expectedErrorCode, actualCode, `Expected error code [${expectedErrorCode}], but got success=${success}, actualCode=[${actualCode}], output=${stderr}`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (isJson) {
    console.log(JSON.stringify({ passed, failed, skipped, notApplicable, tests: results }, null, 2));
  } else {
    console.log('\nSummary:');
    console.log(`  PASS: ${passed}`);
    console.log(`  FAIL: ${failed}`);
    console.log(`  SKIP: ${skipped}`);
    console.log(`  NOT_APPLICABLE: ${notApplicable}\n`);
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
