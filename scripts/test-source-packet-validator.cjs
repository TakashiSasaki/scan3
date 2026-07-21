const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
  { name: 'invalid-missing-owner-value', expectSuccess: false }
];

let allPassed = true;

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
    console.log(`PASS: ${test.name}`);
  } else {
    console.error(`FAIL: ${test.name} (Expected success: ${test.expectSuccess}, but got: ${success})`);
    allPassed = false;
  }
}

// Symlink test
console.log('Running symbolic link self-test...');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-symlink-test-'));
try {
  const packetDir = path.join(tempDir, 'packet');
  const payloadDir = path.join(packetDir, 'payload');
  const outsideFile = path.join(tempDir, 'outside.txt');
  
  fs.mkdirSync(payloadDir, { recursive: true });
  fs.writeFileSync(outsideFile, 'test');
  
  const symlinkPath = path.join(payloadDir, 'example.txt');
  let symlinkCreated = false;
  try {
    fs.symlinkSync(outsideFile, symlinkPath);
    symlinkCreated = true;
  } catch (e) {
    console.log(`SKIP: Symbolic link test skipped due to environment restriction: ${e.message}`);
  }

  if (symlinkCreated) {
    const manifest = {
      "formatVersion": "1.0",
      "packetId": "symlink-test",
      "purpose": "test symlink",
      "source": { "repository": "test/source", "commit": "0000000000000000000000000000000000000000" },
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
      console.log('PASS: symbolic-link-test (validator correctly rejected symlink)');
    } else {
      console.error('FAIL: symbolic-link-test (validator allowed symlink!)');
      allPassed = false;
    }
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('All validator tests passed.');
}
