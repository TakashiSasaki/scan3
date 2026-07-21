const { validateRawRelativePath } = require('./validate-source-packet.cjs');

let passed = 0;
let failed = 0;
let skipped = 0;
let notApplicable = 0;

function runPathTest(name, inputPath, fieldName, expectSuccess, expectedCode) {
  let success = false;
  let actualCode = null;
  let errorMsg = '';

  try {
    validateRawRelativePath(inputPath, fieldName);
    success = true;
  } catch (e) {
    success = false;
    actualCode = e.code || null;
    errorMsg = e.message || String(e);
  }

  if (expectSuccess) {
    if (success) {
      passed++;
      console.log(`PASS: ${name}`);
    } else {
      failed++;
      console.error(`FAIL: ${name} (Expected success, but got error: ${errorMsg})`);
    }
  } else {
    if (!success && actualCode === expectedCode) {
      passed++;
      console.log(`PASS: ${name} (Received expected code [${actualCode}])`);
    } else {
      failed++;
      console.error(`FAIL: ${name} (Expected error code [${expectedCode}], got success=${success}, actualCode=[${actualCode}], error=${errorMsg})`);
    }
  }
}

// 1. NUL character
runPathTest('NUL character path', 'file\0.txt', 'payloadPath', false, 'PATH_INVALID');

// 2. Absolute POSIX path
runPathTest('Absolute POSIX path', '/etc/passwd', 'payloadPath', false, 'PATH_INVALID');

// 3. Windows drive path (backslash and forward slash)
runPathTest('Windows drive path backslash', 'C:\\Windows\\System32', 'payloadPath', false, 'PATH_INVALID');
runPathTest('Windows drive path slash', 'C:/Windows/System32', 'payloadPath', false, 'PATH_INVALID');

// 4. UNC path
runPathTest('UNC path', '\\\\server\\share\\file.txt', 'payloadPath', false, 'PATH_INVALID');

// 5. '.' segment
runPathTest('Dot segment in middle', 'a/./b.txt', 'payloadPath', false, 'PATH_INVALID');
runPathTest('Dot segment alone', '.', 'payloadPath', false, 'PATH_INVALID');

// 6. '..' segment
runPathTest('Dot dot segment in middle', 'a/../b.txt', 'payloadPath', false, 'PATH_INVALID');
runPathTest('Dot dot segment alone', '..', 'payloadPath', false, 'PATH_INVALID');

// 7. Whitespace-only path
runPathTest('Whitespace-only path', '   ', 'payloadPath', false, 'PATH_INVALID');

// 8. Non-string path
runPathTest('Non-string path', 12345, 'payloadPath', false, 'PATH_INVALID');

// 9. Valid dotted filename
runPathTest('Valid dotted filename archive', 'archive.tar.gz', 'payloadPath', true, null);
runPathTest('Valid dotted filename nested', 'directory.name/file.name.txt', 'payloadPath', true, null);

console.log(`\nPath Helper Test Summary: PASS: ${passed}, FAIL: ${failed}, SKIP: ${skipped}, NOT_APPLICABLE: ${notApplicable}`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
