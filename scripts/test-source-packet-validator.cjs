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

// Symlink test
if (!isJson) console.log('Running symbolic link self-test...');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-symlink-test-'));
try {
  const packetDir = path.join(tempDir, 'packet');
  const payloadDir = path.join(packetDir, 'payload');
  const outsideFile = path.join(tempDir, 'outside.txt');
  
  fs.mkdirSync(payloadDir, { recursive: true });
  fs.writeFileSync(outsideFile, 'test');
  
  const symlinkPath = path.join(payloadDir, 'example.txt');
  let symlinkCreated = false;
  let skipReason = '';
  try {
    fs.symlinkSync(outsideFile, symlinkPath);
    symlinkCreated = true;
  } catch (e) {
    skipReason = e.message;
  }
  
  if (symlinkCreated) {
    const manifest = {
      "formatVersion": "1.0",
      "packetId": "symlink-test",
      "purpose": "test symlink",
      "source": { "repository": "TakashiSasaki/legacy", "commit": "0000000000000000000000000000000000000000" },
      "destination": { "repository": "TakashiSasaki/scan3", "baselineCommit": "0000000000000000000000000000000000000000" },
      "files": [
        {
          "sourcePath": "example.txt",
          "payloadPath": "example.txt",
          "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
          "sizeBytes": 4,
          "disposition": "restore",
          "intendedDestination": "test.txt"
        }
      ],
      "ownerDecisions": [{ "id": "d1", "value": true, "reason": "test" }]
    };
    fs.writeFileSync(path.join(packetDir, 'manifest.json'), JSON.stringify(manifest));
    
    let success = false;
    try {
      execFileSync(process.execPath, [validatorPath, packetDir], { stdio: 'ignore' });
      success = true;
    } catch (e) {
      success = false;
    }
    
    if (success === false) {
      passed++;
      logTest('symbolic-link-test', 'PASS');
    } else {
      failed++;
      logTest('symbolic-link-test', 'FAIL', 'validator allowed symlink!');
    }
  } else {
    skipped++;
    logTest('symbolic-link-test', 'SKIP', skipReason);
  }

  // invalid-payload-root-not-directory test
  if (!isJson) console.log('Running invalid-payload-root-not-directory test...');
  const packetDir2 = path.join(tempDir, 'packet2');
  fs.mkdirSync(packetDir2, { recursive: true });
  fs.writeFileSync(path.join(packetDir2, 'payload'), 'this is a file, not a dir');
  const manifest2 = {
    "formatVersion": "1.0",
    "packetId": "invalid-payload-root",
    "purpose": "test",
    "source": { "repository": "TakashiSasaki/legacy", "commit": "0000000000000000000000000000000000000000" },
    "destination": { "repository": "TakashiSasaki/scan3", "baselineCommit": "0000000000000000000000000000000000000000" },
    "files": [],
    "ownerDecisions": []
  };
  fs.writeFileSync(path.join(packetDir2, 'manifest.json'), JSON.stringify(manifest2));
  
  let success2 = false;
  try {
    execFileSync(process.execPath, [validatorPath, packetDir2], { stdio: 'ignore' });
    success2 = true;
  } catch (e) {
    success2 = false;
  }
  if (success2 === false) {
    passed++;
    logTest('invalid-payload-root-not-directory', 'PASS');
  } else {
    failed++;
    logTest('invalid-payload-root-not-directory', 'FAIL', 'validator allowed file as payload root');
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
