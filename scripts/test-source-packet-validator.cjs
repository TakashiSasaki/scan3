const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isJson = process.argv.includes('--json');
const validatorPath = path.join(__dirname, 'validate-source-packet.cjs');
const examplesDir = path.join(__dirname, '../reconstruction/examples');

const tests = [
  { name: 'minimal', expectSuccess: true },
  { name: 'invalid-path-traversal', expectSuccess: false },
  { name: 'invalid-hash', expectSuccess: false },
  { name: 'invalid-size', expectSuccess: false },
  { name: 'invalid-duplicate-destination', expectSuccess: false },
  { name: 'invalid-embedded-traversal', expectSuccess: false },
  { name: 'invalid-windows-traversal', expectSuccess: false },
  { name: 'invalid-noninteger-size', expectSuccess: false },
  { name: 'invalid-notes-type', expectSuccess: false },
  { name: 'invalid-missing-owner-value', expectSuccess: false },
  { name: 'invalid-nul-path', expectSuccess: false },
  { name: 'invalid-dot-segment-posix', expectSuccess: false },
  { name: 'invalid-dot-segment-windows', expectSuccess: false },
  { name: 'invalid-packet-id-type', expectSuccess: false },
  { name: 'invalid-purpose-type', expectSuccess: false },
  { name: 'invalid-source-repository-type', expectSuccess: false },
  { name: 'invalid-file-entry-type', expectSuccess: false },
  { name: 'invalid-owner-decision-array', expectSuccess: false },
  { name: 'valid-dotted-filenames', expectSuccess: true }
];

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

for (const test of tests) {
  const target = path.join(examplesDir, test.name);
  let success = false;
  try {
    execFileSync(process.execPath, [validatorPath, target], { stdio: 'ignore' });
    success = true;
  } catch (e) {
    success = false;
  }
  
  if (success === test.expectSuccess) {
    passed++;
    logTest(test.name, 'PASS');
  } else {
    failed++;
    logTest(test.name, 'FAIL', `Expected success: ${test.expectSuccess}, but got: ${success}`);
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
