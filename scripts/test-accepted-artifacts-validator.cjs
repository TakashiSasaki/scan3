const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { validateArtifactPath } = require('./validate-accepted-artifacts.cjs');

const validatorPath = path.join(__dirname, 'validate-accepted-artifacts.cjs');

let passed = 0;
let failed = 0;
let skipped = 0;

function runDirectTest(name, entryPath, expectedSuccess) {
  let success = false;
  let error = '';
  try {
    validateArtifactPath(entryPath);
    success = true;
  } catch (e) {
    success = false;
    error = e.message;
  }
  if (success === expectedSuccess) {
    passed++;
    console.log(`PASS (Direct): ${name}`);
  } else {
    failed++;
    console.error(`FAIL (Direct): ${name} (Expected success: ${expectedSuccess}, Got: ${success})`);
    if (!success) console.error(error);
  }
}

function runTest(name, inventory, expectedSuccess) {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-art-'));
  const invPath = path.join(tmpdir, 'inventory.json');
  fs.writeFileSync(invPath, JSON.stringify(inventory));
  
  let success = false;
  let stderr = '';
  try {
    execFileSync(process.execPath, [validatorPath, invPath], { stdio: 'pipe' });
    success = true;
  } catch (e) {
    success = false;
    stderr = e.stderr ? e.stderr.toString() : e.message;
  }
  
  fs.rmSync(tmpdir, { recursive: true, force: true });
  
  if (success === expectedSuccess) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failed++;
    console.error(`FAIL: ${name} (Expected success: ${expectedSuccess}, Got: ${success})`);
    if (!success) console.error(stderr);
  }
}

// Direct positive/negative string tests (bypasses fs existence)
runDirectTest('file..name.md', 'file..name.md', true);
runDirectTest('dir/file..name.md', 'dir/file..name.md', true);
runDirectTest('dir/../file.md', 'dir/../file.md', false);
runDirectTest('dir/./file.md', 'dir/./file.md', false);

// Positive tests
runTest('empty array is allowed if all requirements present', [
  'reconstruction/accepted-artifacts.json',
  'scripts/validate-accepted-artifacts.cjs',
  'policy/regression-prevention.md',
  'policy/decision-gates.md',
  'AGENTS.md',
  'README.md',
  'package.json',
  'package-lock.json',
  '.github/workflows/verify-reconstruction.yml',
  'reconstruction/source-packet-constraints.json',
  'reconstruction/source-packet-fixture-expectations.json',
  'scripts/test-source-packet-validator.cjs',
  'scripts/test-source-packet-schema.cjs',
  'scripts/validate-source-packet-contract.cjs',
  'scripts/validate-agent-skills.cjs',
  'scripts/validate-ci-workflow.cjs',
  'scripts/validate-control-registries.cjs',
  'reconstruction/agent-skills.json'
], true);

const baseReqs = [
  'reconstruction/accepted-artifacts.json',
  'scripts/validate-accepted-artifacts.cjs',
  'policy/regression-prevention.md',
  'policy/decision-gates.md',
  'AGENTS.md',
  'README.md',
  'package.json',
  'package-lock.json',
  '.github/workflows/verify-reconstruction.yml',
  'reconstruction/source-packet-constraints.json',
  'reconstruction/source-packet-fixture-expectations.json',
  'scripts/test-source-packet-validator.cjs',
  'scripts/test-source-packet-schema.cjs',
  'scripts/validate-source-packet-contract.cjs',
  'scripts/validate-agent-skills.cjs',
  'scripts/validate-ci-workflow.cjs',
  'scripts/validate-control-registries.cjs',
  'reconstruction/agent-skills.json'
];

runTest('valid file..name.md', [...baseReqs, 'reconstruction/examples/valid-dotted-filenames/manifest.json'], true);

// self-reference 欠落
runTest('self-reference 欠落', baseReqs.filter(x => x !== 'reconstruction/accepted-artifacts.json'), false);

// validator 欠落
runTest('validator 欠落', baseReqs.filter(x => x !== 'scripts/validate-accepted-artifacts.cjs'), false);

// duplicate
runTest('duplicate', [...baseReqs, 'AGENTS.md'], false);

// absolute path
runTest('absolute path', [...baseReqs, '/AGENTS.md'], false);

// .. segment
runTest('.. segment', [...baseReqs, 'reconstruction/../AGENTS.md'], false);

// nonexistent file
runTest('nonexistent file', [...baseReqs, 'nonexistent-file.txt'], false);

// directory
runTest('directory', [...baseReqs, 'reconstruction/examples'], false);

// NUL path test (Cannot use a real file with NUL, so we just pass NUL to validator and it should fail)
runTest('NUL path', [...baseReqs, 'package\0.json'], false);

// . segment test
runTest('. segment', [...baseReqs, 'scripts/./validate-accepted-artifacts.cjs'], false);

// Symlink test
const tmpdir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-art-sym-'));
try {
  const linkPath = path.join(__dirname, '..', 'temp-symlink.txt');
  let symlinkCreated = false;
  let skipReason = '';
  try {
    fs.symlinkSync('package.json', linkPath);
    symlinkCreated = true;
  } catch (e) {
    skipReason = e.message;
  }

  if (symlinkCreated) {
    runTest('symlink artifact', [...baseReqs, 'temp-symlink.txt'], false);
    fs.unlinkSync(linkPath);
  } else {
    skipped++;
    console.log(`SKIP: symlink artifact - ${skipReason}`);
  }
} finally {
  fs.rmSync(tmpdir2, { recursive: true, force: true });
}

console.log(`\nSummary: PASS: ${passed}, FAIL: ${failed}, SKIP: ${skipped}`);
if (failed > 0) process.exit(1);
