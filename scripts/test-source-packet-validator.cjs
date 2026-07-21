const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const defaultManifest = {
  "formatVersion": "1.0",
  "packetId": "dynamic-test",
  "purpose": "test",
  "source": { "repository": "TakashiSasaki/legacy", "commit": "0000000000000000000000000000000000000000" },
  "destination": { "repository": "TakashiSasaki/scan3", "baselineCommit": "0000000000000000000000000000000000000000" },
  "files": [],
  "ownerDecisions": []
};

const ALLOWED_SYMLINK_ERRORS = new Set(['EPERM', 'ENOSYS', 'EINVAL', 'EACCES']);

function safeSymlink(target, linkPath, type) {
  try {
    fs.symlinkSync(target, linkPath, type);
  } catch (e) {
    if (e.code && ALLOWED_SYMLINK_ERRORS.has(e.code)) {
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
  const results = [];

  function logTest(name, result, reason) {
    results.push({ name, result, reason: reason || null });
    if (!isJson) {
      if (result === 'SKIP') {
        console.log(`SKIP: ${name} — ${reason}`);
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
      logTest(name, 'FAIL', 'Fixture directory exists on filesystem but is missing from catalog');
    }
  }

  for (const exp of expectations) {
    if (!fixtureDirs.has(exp.fixture)) {
      failed++;
      logTest(exp.fixture, 'FAIL', 'Fixture catalog entry exists but directory is missing from filesystem');
      continue;
    }
    
    const target = path.join(examplesDir, exp.fixture);
    const manifestPath = path.join(target, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      failed++;
      logTest(exp.fixture, 'FAIL', 'manifest.json not found in fixture directory');
      continue;
    }

    if (exp.operationalExpected === 'SKIP_ALLOWED') {
      skipped++;
      logTest(exp.fixture, 'SKIP', exp.reason);
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
    
    let isCodeMatch = true;
    let actualCode = null;
    if (!success && stderr) {
      const match = stderr.match(/\[([A-Z0-9_]+)\]/);
      if (match) actualCode = match[1];
    }

    if (exp.expectedErrorCode) {
      isCodeMatch = actualCode === exp.expectedErrorCode;
    }

    if (success === expectSuccess && isCodeMatch) {
      passed++;
      logTest(exp.fixture, 'PASS');
    } else {
      failed++;
      logTest(exp.fixture, 'FAIL', `Expected success: ${expectSuccess}, expectedErrorCode: ${exp.expectedErrorCode || 'N/A'}, but got success: ${success}, actualCode: ${actualCode}. Output: ${stderr}`);
    }
  }

  if (!isJson) console.log('Running dynamic operational tests...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-operational-test-'));

  const dynamicExpectationsPath = path.join(__dirname, '../reconstruction/source-packet-dynamic-test-expectations.json');
  const dynamicExpectations = JSON.parse(fs.readFileSync(dynamicExpectationsPath, 'utf8'));

  // Verify bidirectional match between registry and setup mapping
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
        const isAllowedSkip = environmentDependent && allowedSkipReasons.includes(setupError.message);
        if (isAllowedSkip) {
          skipped++;
          logTest(name, 'SKIP', setupError.message);
        } else {
          failed++;
          logTest(name, 'FAIL', `Unexpected setup error: ${setupError.message}`);
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
        logTest(name, 'PASS');
      } else {
        failed++;
        logTest(name, 'FAIL', `Expected error code [${expectedErrorCode}], but got success=${success}, actualCode=[${actualCode}], output=${stderr}`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (isJson) {
    console.log(JSON.stringify({ passed, failed, skipped, tests: results }, null, 2));
  } else {
    console.log('\nSummary:');
    console.log(`  PASS: ${passed}`);
    console.log(`  FAIL: ${failed}`);
    console.log(`  SKIP: ${skipped}\n`);
    
    if (skipped > 0) {
      console.log('Validator tests completed with SKIP.');
    } else {
      console.log('Validator tests completed successfully with no skips.');
    }
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
