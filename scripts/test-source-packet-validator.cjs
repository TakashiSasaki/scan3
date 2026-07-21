const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
  
  if (success === expectSuccess) {
    passed++;
    logTest(exp.fixture, 'PASS');
  } else {
    failed++;
    logTest(exp.fixture, 'FAIL', `Expected success: ${expectSuccess}, but got: ${success}. Output: ${stderr}`);
  }
}

// Dynamic tests for operational validation failure branches
if (!isJson) console.log('Running dynamic operational tests...');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-operational-test-'));

function runDynamicTest(name, expectedErrorCode, setupFn) {
  const packetDir = path.join(tempDir, name);
  fs.mkdirSync(packetDir, { recursive: true });
  const payloadDir = path.join(packetDir, 'payload');
  
  let skipReason = '';
  let isSetupOk = false;
  try {
    setupFn(packetDir, payloadDir);
    isSetupOk = true;
  } catch (e) {
    skipReason = e.message;
  }
  
  if (isSetupOk) {
    let success = false;
    let stderr = '';
    try {
      execFileSync(process.execPath, [validatorPath, packetDir], { stdio: 'pipe' });
      success = true;
    } catch (e) {
      success = false;
      stderr = e.stderr ? e.stderr.toString() : e.message;
    }
    
    if (success === false && stderr.includes(`[${expectedErrorCode}]`)) {
      passed++;
      logTest(name, 'PASS');
    } else {
      failed++;
      logTest(name, 'FAIL', `Expected error code [${expectedErrorCode}], but got success=${success}, output=${stderr}`);
    }
  } else {
    skipped++;
    logTest(name, 'SKIP', skipReason);
  }
}

const defaultManifest = {
  "formatVersion": "1.0",
  "packetId": "dynamic-test",
  "purpose": "test",
  "source": { "repository": "TakashiSasaki/legacy", "commit": "0000000000000000000000000000000000000000" },
  "destination": { "repository": "TakashiSasaki/scan3", "baselineCommit": "0000000000000000000000000000000000000000" },
  "files": [],
  "ownerDecisions": []
};

try {
  runDynamicTest('invalid-payload-root-missing', 'PAYLOAD_ROOT_MISSING', (packetDir, payloadDir) => {
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  });

  runDynamicTest('invalid-payload-root-not-directory', 'PAYLOAD_ROOT_NOT_DIRECTORY', (packetDir, payloadDir) => {
    fs.writeFileSync(payloadDir, 'file not dir');
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  });

  runDynamicTest('invalid-payload-root-symlink', 'PAYLOAD_ROOT_SYMLINK', (packetDir, payloadDir) => {
    const realDir = path.join(tempDir, 'real-payload');
    fs.mkdirSync(realDir, { recursive: true });
    fs.symlinkSync(realDir, payloadDir, 'dir');
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(defaultManifest));
  });

  runDynamicTest('invalid-payload-file-missing', 'PAYLOAD_FILE_MISSING', (packetDir, payloadDir) => {
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
  });

  runDynamicTest('invalid-payload-file-symlink-outside', 'PAYLOAD_REALPATH_ESCAPE', (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const outsideFile = path.join(tempDir, 'outside.txt');
    fs.writeFileSync(outsideFile, 'test');
    fs.symlinkSync(outsideFile, path.join(payloadDir, 'outside.txt'));
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "outside.txt",
      "payloadPath": "outside.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  });

  runDynamicTest('invalid-payload-file-symlink-inside', 'PAYLOAD_FILE_SYMLINK', (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const insideFile = path.join(payloadDir, 'inside.txt');
    fs.writeFileSync(insideFile, 'test');
    fs.symlinkSync(insideFile, path.join(payloadDir, 'link.txt'));
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "link.txt",
      "payloadPath": "link.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  });

  runDynamicTest('invalid-payload-ancestor-symlink', 'PAYLOAD_ANCESTOR_SYMLINK', (packetDir, payloadDir) => {
    fs.mkdirSync(payloadDir, { recursive: true });
    const realSubdir = path.join(payloadDir, 'real-sub');
    fs.mkdirSync(realSubdir);
    const insideFile = path.join(realSubdir, 'file.txt');
    fs.writeFileSync(insideFile, 'test');
    fs.symlinkSync(realSubdir, path.join(payloadDir, 'link-sub'), 'dir');
    const manifest = { ...defaultManifest, files: [{
      "sourcePath": "link-sub/file.txt",
      "payloadPath": "link-sub/file.txt",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "sizeBytes": 4,
      "disposition": "reference",
      "intendedDestination": "test.txt"
    }]};
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
  });

  runDynamicTest('invalid-payload-not-regular-file', 'PAYLOAD_NOT_REGULAR_FILE', (packetDir, payloadDir) => {
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
  });

  runDynamicTest('invalid-payload-size-mismatch', 'PAYLOAD_SIZE_MISMATCH', (packetDir, payloadDir) => {
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
  });

  runDynamicTest('invalid-payload-hash-mismatch', 'PAYLOAD_HASH_MISMATCH', (packetDir, payloadDir) => {
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
  });

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
