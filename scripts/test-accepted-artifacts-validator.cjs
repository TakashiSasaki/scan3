const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { validateArtifactPath } = require('./validate-accepted-artifacts.cjs');
const { REQUIRED_ACCEPTED_ARTIFACTS } = require('./lib/required-accepted-artifacts.cjs');
const { isCapabilityLimitedSymlinkError } = require('./lib/symlink-capability.cjs');

const validatorPath = path.join(__dirname, 'validate-accepted-artifacts.cjs');

let passed = 0;
let failed = 0;
let skipped = 0;
let notApplicable = 0;

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
  
  try {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  } catch (e) {
    failed++;
    console.error(`FAIL: Cleanup failed for temporary inventory directory ${tmpdir}: ${e.message}`);
  }
  
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

const baseReqs = REQUIRED_ACCEPTED_ARTIFACTS;

// Positive tests
runTest('empty array is allowed if all requirements present', baseReqs, true);
runTest('valid file..name.md', [...baseReqs, 'reconstruction/examples/valid-dotted-filenames/manifest.json'], true);

// Dynamically generated negative tests for missing required entries
for (const reqEntry of REQUIRED_ACCEPTED_ARTIFACTS) {
  const reducedReqs = baseReqs.filter(x => x !== reqEntry);
  runTest(`Missing required entry negative test: ${reqEntry}`, reducedReqs, false);
}

// Duplicate test
runTest('duplicate', [...baseReqs, 'AGENTS.md'], false);

// Absolute path test
runTest('absolute path', [...baseReqs, '/AGENTS.md'], false);

// .. segment test
runTest('.. segment', [...baseReqs, 'reconstruction/../AGENTS.md'], false);

// Nonexistent file test
runTest('nonexistent file', [...baseReqs, 'nonexistent-file.txt'], false);

// Directory test
runTest('directory', [...baseReqs, 'reconstruction/examples'], false);

// NUL path test
runTest('NUL path', [...baseReqs, 'package\0.json'], false);

// . segment test
runTest('. segment', [...baseReqs, 'scripts/./validate-accepted-artifacts.cjs'], false);

// Collision-safe unique temporary directory under reconstruction/examples for symlink test
const examplesBaseDir = path.join(__dirname, '..', 'reconstruction', 'examples');
const tempSymlinkDir = fs.mkdtempSync(path.join(examplesBaseDir, 'symlink-test-'));
const symlinkPath = path.join(tempSymlinkDir, 'temp-symlink.txt');
const relativeSymlinkArtifact = path.relative(path.join(__dirname, '..'), symlinkPath).replace(/\\/g, '/');

try {
  let symlinkCreated = false;
  let setupError = null;
  try {
    fs.symlinkSync('manifest.json', symlinkPath);
    symlinkCreated = true;
  } catch (e) {
    setupError = e;
  }

  if (symlinkCreated) {
    runTest('symlink artifact', [...baseReqs, relativeSymlinkArtifact], false);
  } else {
    if (isCapabilityLimitedSymlinkError(setupError)) {
      skipped++;
      console.log(`SKIP: symlink artifact - ${setupError.message}`);
    } else {
      failed++;
      console.error(`FAIL: symlink artifact setup failed with unexpected error: ${setupError ? setupError.message : 'Unknown'}`);
    }
  }
} finally {
  let cleanupFailed = false;
  let cleanupError = null;
  try {
    if (fs.existsSync(symlinkPath)) {
      fs.unlinkSync(symlinkPath);
    }
    if (fs.existsSync(tempSymlinkDir)) {
      fs.rmSync(tempSymlinkDir, { recursive: true, force: true });
    }
  } catch (e) {
    cleanupFailed = true;
    cleanupError = e;
  }
  if (cleanupFailed) {
    failed++;
    console.error(`FAIL: Cleanup failed for temporary symlink directory ${tempSymlinkDir}: ${cleanupError ? cleanupError.message : 'Unknown error'}`);
  }
}

console.log(`\nSummary: PASS: ${passed}, FAIL: ${failed}, SKIP: ${skipped}, NOT_APPLICABLE: ${notApplicable}`);
if (failed > 0) process.exit(1);
