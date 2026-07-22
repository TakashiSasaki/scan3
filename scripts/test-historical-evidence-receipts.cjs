const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { validateReceipt } = require('./lib/historical-evidence-receipt-validator.cjs');
const { isCapabilityLimitedSymlinkError } = require('./lib/symlink-capability.cjs');

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passCount++;
  } catch (err) {
    if (err.name === 'SkipError') {
      console.log(`SKIP: ${name} - ${err.message}`);
      skipCount++;
    } else {
      console.error(`FAIL: ${name}`);
      console.error(err);
      failCount++;
    }
  }
}

class SkipError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SkipError';
  }
}

function assertFail(result, expectedErrorSubstring) {
  if (result.valid) {
    throw new Error(`Expected validation to fail with "${expectedErrorSubstring}", but it passed.`);
  }
  const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join(' | ');
  if (!errorMessages.includes(expectedErrorSubstring)) {
    throw new Error(`Expected error containing "${expectedErrorSubstring}", got: ${errorMessages}`);
  }
}

function assertPass(result) {
  if (!result.valid) {
    throw new Error(`Expected validation to pass, but it failed: ${JSON.stringify(result.errors, null, 2)}`);
  }
}

function createSyntheticReceipt(tempDir, overrides = {}, fileOverrides = {}) {
  const receiptDir = path.join(tempDir, 'reconstruction/historical/test-receipt');
  fs.mkdirSync(receiptDir, { recursive: true });
  const receiptPath = path.join(receiptDir, 'receipt.json');

  const storedPathStr = 'reconstruction/historical/test-receipt/test.tsx.source';
  const storedFileAbs = path.join(tempDir, storedPathStr);
  const content = 'synthetic test content';
  fs.writeFileSync(storedFileAbs, content);
  
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  const baseReceipt = {
    formatVersion: "1.0",
    scope: "historical-evidence-only",
    packetId: "test-packet-id",
    distributionCommit: "37261c7693429f5ac9fabbe9c614b5203a107b38",
    supersedesForStaging: null,
    source: {
      repository: "TakashiSasaki/scan.moukaeritai.work",
      commit: "a41267a7d79417706fd8f57b42fa67635a8de3b4"
    },
    destination: {
      repository: "TakashiSasaki/scan3",
      expectedBaselineCommit: "c10f1be62c970cffd0d2c43c965beefdfb2beb37",
      workspaceCommitVerified: false
    },
    validation: {
      zipSha256: "bf9137dc65650474882ce04c7c55f6b42fd01fe28bc15f4b5e3c074c3a55273f",
      officialSourcePacketValidator: "PASS",
      exactByteVerification: "PASS"
    },
    restoredFiles: [
      {
        sourcePath: "src/test.tsx",
        storedPath: storedPathStr,
        sha256: hash,
        sizeBytes: content.length,
        ...fileOverrides
      }
    ],
    runtime: {
      adapted: false,
      imported: false,
      routeActivated: false,
      dependenciesInstalled: false,
      compilerConfigurationChanged: false,
      firebaseConnectivityAdded: false
    },
    ...overrides
  };

  fs.writeFileSync(receiptPath, JSON.stringify(baseReceipt, null, 2));
  
  const inventory = [
    'reconstruction/historical/test-receipt/receipt.json',
    storedPathStr
  ];
  
  return { receiptPath, tempDir, inventory };
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  
  runTest('repository上の現在のlegacy scanner receiptがPASS', () => {
    const existingReceipt = path.join(repoRoot, 'reconstruction/historical/legacy-scanner/a41267a7/receipt.json');
    const result = validateReceipt(existingReceipt);
    assertPass(result);
  });

  const createdTempRoots = new Set();
  const getTempRoot = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan3-receipt-test-'));
    createdTempRoots.add(dir);
    return dir;
  };

  function attemptSymlink(target, file, symlinkFn) {
    try {
      symlinkFn(target, file);
    } catch (e) {
      if (isCapabilityLimitedSymlinkError(e)) {
        throw new SkipError(`Environment cannot create symlinks: ${e.code} ${e.message}`);
      }
      throw e;
    }
  }

  try {
    runTest('synthetic valid receiptがPASS', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertPass(result);
    });

    runTest('.tsx.sourceがPASS', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertPass(result);
    });

    const nonblankTests = [
      ['packetId', 'packetId space-only', '   '],
      ['source.repository', 'source.repository tab-only', '\t\t'],
      ['destination.repository', 'destination.repository newline-only', '\n'],
      ['restoredFiles[0].sourcePath', 'sourcePath whitespace-only', ' \t\n '],
      ['restoredFiles[0].storedPath', 'storedPath whitespace-only', '   '],
    ];
    for (const [field, testName, badValue] of nonblankTests) {
      runTest(`${testName}ならFAIL`, () => {
        const dir = getTempRoot();
        const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
        const data = JSON.parse(fs.readFileSync(receiptPath));
        if (field.startsWith('source.')) data.source[field.split('.')[1]] = badValue;
        else if (field.startsWith('destination.')) data.destination[field.split('.')[1]] = badValue;
        else if (field.startsWith('restoredFiles[0].')) data.restoredFiles[0][field.split('.')[1]] = badValue;
        else data[field] = badValue;
        fs.writeFileSync(receiptPath, JSON.stringify(data));
        
        let newInv = inventory;
        if (field === 'restoredFiles[0].storedPath') {
           newInv = ['reconstruction/historical/test-receipt/receipt.json', badValue];
        }
        const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
        assertFail(result, 'must match pattern');
      });
    }

    runTest('supersedesForStagingのitemがwhitespace-onlyならFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      data.supersedesForStaging = ["   "];
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'must match pattern');
    });

    runTest('inventory内にartifact root配下のorphan fileがあるとFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const orphanPath = 'reconstruction/historical/test-receipt/orphan.bin';
      const newInv = [...inventory, orphanPath];
      
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'inventory.reverseBinding');
    });

    runTest('orphan fileが実際にregular fileとして存在する場合でもFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const orphanPath = 'reconstruction/historical/test-receipt/orphan.bin';
      fs.writeFileSync(path.join(tempDir, orphanPath), 'orphan');
      const newInv = [...inventory, orphanPath];
      
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'inventory.reverseBinding');
    });

    runTest('storedPathが別artifact rootにあるとFAIL', () => {
      const dir = getTempRoot();
      const badPath = 'reconstruction/historical/other-receipt/test.tsx.source';
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, {}, { storedPath: badPath });
      fs.mkdirSync(path.join(tempDir, 'reconstruction/historical/other-receipt'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, badPath), 'synthetic test content');
      
      const newInv = ['reconstruction/historical/test-receipt/receipt.json', badPath];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'storedPath must be a strict descendant of the artifact root');
    });

    runTest('root名の文字列prefixだけが一致するsibling pathはFAIL', () => {
      const dir = getTempRoot();
      const badPath = 'reconstruction/historical/test-receipt-copy/test.tsx.source';
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, {}, { storedPath: badPath });
      fs.mkdirSync(path.join(tempDir, 'reconstruction/historical/test-receipt-copy'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, badPath), 'synthetic test content');
      
      const newInv = ['reconstruction/historical/test-receipt/receipt.json', badPath];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'storedPath must be a strict descendant of the artifact root');
    });

    runTest('historical .css evidenceがPASS', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, {}, { sourcePath: 'style.css', storedPath: 'reconstruction/historical/test-receipt/style.css' });
      const cssPath = path.join(tempDir, 'reconstruction/historical/test-receipt/style.css');
      fs.writeFileSync(cssPath, 'css content');
      const baseReceipt = JSON.parse(fs.readFileSync(receiptPath));
      baseReceipt.restoredFiles[0].sha256 = crypto.createHash('sha256').update('css content').digest('hex');
      baseReceipt.restoredFiles[0].sizeBytes = 'css content'.length;
      fs.writeFileSync(receiptPath, JSON.stringify(baseReceipt));
      
      const newInv = ['reconstruction/historical/test-receipt/receipt.json', 'reconstruction/historical/test-receipt/style.css'];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertPass(result);
    });

    runTest('404: Not Foundをreceiptとして与えるとFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      fs.writeFileSync(receiptPath, '404: Not Found');
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'Failed to parse receipt as JSON');
    });

    runTest('malformed JSONがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      fs.writeFileSync(receiptPath, '{ "formatVersion": "1.0", '); // broken
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'Failed to parse receipt as JSON');
    });

    runTest('required field不足がFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      delete data.formatVersion;
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'must have required property \'formatVersion\'');
    });

    runTest('unknown top-level fieldがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, { extraField: "invalid" });
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'must NOT have additional properties');
    });

    runTest('invalid commit SHAがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, { distributionCommit: "short" });
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'must match pattern');
    });

    runTest('invalid SHA-256がFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      data.validation.zipSha256 = "invalid";
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'must match pattern');
    });

    runTest('absolute storedPathがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      const abs = path.join(tempDir, 'reconstruction/historical/test-receipt/test.tsx.source');
      data.restoredFiles[0].storedPath = abs;
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      
      const newInv = [...inventory, abs];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'Path must not be absolute');
    });

    runTest('.. segmentがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      const badPath = 'reconstruction/historical/../historical/test-receipt/test.tsx.source';
      data.restoredFiles[0].storedPath = badPath;
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      
      const badAbs = path.join(tempDir, 'reconstruction/historical/test-receipt/test.tsx.source');
      fs.writeFileSync(badAbs, 'synthetic test content');
      
      const newInv = ['reconstruction/historical/test-receipt/receipt.json', badPath];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'Path must not contain . or .. segments');
    });

    runTest('inventoryにreceiptが未登録ならFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const newInv = [inventory[1]];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'is not registered in accepted-artifacts.json');
    });

    runTest('inventoryにstoredPathが未登録ならFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const newInv = [inventory[0]];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'storedPath is not registered in accepted-artifacts.json');
    });

    runTest('duplicate storedPathがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      data.restoredFiles.push(data.restoredFiles[0]);
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'Duplicate storedPath');
    });

    runTest('stored file不存在がFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      fs.rmSync(path.join(tempDir, 'reconstruction/historical/test-receipt/test.tsx.source'));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'File does not exist');
    });

    runTest('stored fileがdirectoryならFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const fileAbs = path.join(tempDir, 'reconstruction/historical/test-receipt/test.tsx.source');
      fs.rmSync(fileAbs);
      fs.mkdirSync(fileAbs);
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'File is not a regular file');
    });

    runTest('size mismatchがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      data.restoredFiles[0].sizeBytes = 9999;
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'Size mismatch');
    });

    runTest('SHA-256 mismatchがFAIL', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const data = JSON.parse(fs.readFileSync(receiptPath));
      data.restoredFiles[0].sha256 = "1234567890123456789012345678901234567890123456789012345678901234";
      fs.writeFileSync(receiptPath, JSON.stringify(data));
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'SHA-256 mismatch');
    });

    runTest('.tsx sourceを.tsxとして保存するとFAIL', () => {
      const dir = getTempRoot();
      const stored = 'reconstruction/historical/test-receipt/test.tsx';
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, {}, { storedPath: stored });
      const data = JSON.parse(fs.readFileSync(receiptPath));
      fs.writeFileSync(path.join(tempDir, stored), 'synthetic test content');
      const newInv = ['reconstruction/historical/test-receipt/receipt.json', stored];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'Active script extension not allowed for storedPath');
    });

    runTest('.js sourceを.jsとして保存するとFAIL', () => {
      const dir = getTempRoot();
      const stored = 'reconstruction/historical/test-receipt/test.js';
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir, {}, { sourcePath: 'src/test.js', storedPath: stored });
      fs.writeFileSync(path.join(tempDir, stored), 'synthetic test content');
      const newInv = ['reconstruction/historical/test-receipt/receipt.json', stored];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertFail(result, 'Active script extension not allowed for storedPath');
    });

    runTest('Symlink artifact', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const fileAbs = path.join(tempDir, 'reconstruction/historical/test-receipt/test.tsx.source');
      fs.rmSync(fileAbs);
      
      const targetAbs = path.join(tempDir, 'target');
      fs.writeFileSync(targetAbs, 'synthetic test content');
      
      attemptSymlink(targetAbs, fileAbs, fs.symlinkSync);

      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertFail(result, 'File is a symbolic link');
    });

    runTest('Symlink control flow (Synthetic EPERM is SkipError)', () => {
      try {
        attemptSymlink('target', 'path', () => {
          const e = new Error('synthetic EPERM');
          e.code = 'EPERM';
          throw e;
        });
        throw new Error('Expected attemptSymlink to throw');
      } catch (e) {
        if (e.name !== 'SkipError') {
          throw new Error(`Expected SkipError, got ${e.name}: ${e.message}`);
        }
      }
    });

    runTest('Symlink control flow (Synthetic EIO is rethrown)', () => {
      const originalError = new Error('synthetic EIO');
      originalError.code = 'EIO';
      try {
        attemptSymlink('target', 'path', () => {
          throw originalError;
        });
        throw new Error('Expected attemptSymlink to throw');
      } catch (e) {
        if (e !== originalError) {
          throw new Error(`Expected original error to be thrown, got: ${e}`);
        }
      }
    });

    runTest('receipt自身はreverse bindingでrestoredFilesに要求されない', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir } = createSyntheticReceipt(dir);
      const inventory = [
        'reconstruction/historical/test-receipt/receipt.json',
        'reconstruction/historical/test-receipt/test.tsx.source'
      ];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertPass(result);
    });

    runTest('inventoryのsibling-prefix entryはreverse bindingの対象にならない (PASSする)', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
      const siblingPath = 'reconstruction/historical/test-receipt-copy/orphan.bin';
      const newInv = [...inventory, siblingPath];
      
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
      assertPass(result);
    });

    runTest('安全なbackslash区切りのinventory entryはcanonicalizeされPASSする', () => {
      const dir = getTempRoot();
      const { receiptPath, tempDir } = createSyntheticReceipt(dir);
      const inventory = [
        'reconstruction\\historical\\test-receipt\\receipt.json',
        'reconstruction\\historical\\test-receipt\\test.tsx.source'
      ];
      const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory });
      assertPass(result);
    });

    const negativeInventoryTests = [
      ['absolute path', path.resolve(__dirname, '../reconstruction/historical/test-receipt/test.tsx.source')],
      ['Windows drive path', 'C:\\reconstruction\\historical\\test-receipt\\test.tsx.source'],
      ['UNC path', '\\\\server\\share\\reconstruction\\historical\\test-receipt\\test.tsx.source'],
      ['NUL path', 'reconstruction/historical/test-receipt/test\0.tsx.source'],
      ['. segment', 'reconstruction/historical/./test-receipt/test.tsx.source'],
      ['.. segment', 'reconstruction/historical/test-receipt/../test-receipt/test.tsx.source'],
      ['escape repository root', '../../outside.txt']
    ];
    for (const [name, badEntry] of negativeInventoryTests) {
      runTest(`inventory safety: ${name}がFAIL`, () => {
        const dir = getTempRoot();
        const { receiptPath, tempDir, inventory } = createSyntheticReceipt(dir);
        const newInv = [...inventory, badEntry];
        const result = validateReceipt(receiptPath, { repoRoot: tempDir, inventory: newInv });
        assertFail(result, `inventory[2]:`);
      });
    }

  } finally {
    let rootsCreated = createdTempRoots.size;
    let rootsRemoved = 0;
    let cleanUpErrors = [];
    for (const dir of createdTempRoots) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        if (fs.existsSync(dir)) {
           cleanUpErrors.push(`Failed to remove (still exists): ${dir}`);
        } else {
           rootsRemoved++;
        }
      } catch (e) {
        cleanUpErrors.push(`${dir} - ${e.code} - ${e.message}`);
      }
    }
    const rootsRemaining = rootsCreated - rootsRemoved;

    if (cleanUpErrors.length > 0) {
      console.error(`\nTemporary resource cleanup:`);
      console.error(`  FAIL`);
      for (const err of cleanUpErrors) {
        console.error(`  ${err}`);
      }
      failCount++;
    } else {
      console.log(`\nTemporary resource cleanup:`);
      console.log(`  PASS`);
      console.log(`  roots created: ${rootsCreated}`);
      console.log(`  roots removed: ${rootsRemoved}`);
      console.log(`  roots remaining: ${rootsRemaining}`);
    }
  }

  console.log(`\nSummary:  PASS: ${passCount}  FAIL: ${failCount}  SKIP: ${skipCount}  NOT_APPLICABLE: 0`);
  if (failCount > 0) {
    process.exit(1);
  }
}

main();
