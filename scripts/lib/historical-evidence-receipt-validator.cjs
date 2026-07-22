const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Ajv = require('ajv');

const schemaPath = path.resolve(__dirname, '../../reconstruction/historical-evidence-receipt.schema.json');
const inventoryPath = path.resolve(__dirname, '../../reconstruction/accepted-artifacts.json');

const ajv = new Ajv({ allErrors: true });
let validateSchemaFn;

const ACTIVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function validateReceipt(receiptPathStr, options = {}) {
  const result = { valid: true, errors: [] };
  const addError = (field, message) => {
    result.valid = false;
    result.errors.push({ field, message });
  };

  const receiptPath = path.resolve(receiptPathStr);
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : path.resolve(__dirname, '../../');
  const invPath = options.inventoryPath || inventoryPath;
  
  if (!validateSchemaFn) {
    const schemaObj = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    validateSchemaFn = ajv.compile(schemaObj);
  }

  const inventory = options.inventory || JSON.parse(fs.readFileSync(invPath, 'utf8'));

  let receiptObj;
  try {
    const content = fs.readFileSync(receiptPath, 'utf8');
    receiptObj = JSON.parse(content);
  } catch (e) {
    addError('JSON', 'Failed to parse receipt as JSON');
    return result;
  }

  if (!validateSchemaFn(receiptObj)) {
    for (const err of validateSchemaFn.errors) {
      addError(err.instancePath || 'schema', err.message);
    }
    return result; // Don't proceed if schema fails
  }

  const checkPath = (p, fieldName) => {
    if (path.isAbsolute(p)) {
      addError(fieldName, 'Path must not be absolute');
    }
    if (/^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\')) {
      addError(fieldName, 'Path must not be Windows drive or UNC');
    }
    if (p.includes('\0')) {
      addError(fieldName, 'Path must not contain NUL byte');
    }
    const segments = p.split(/[\\/]/);
    if (segments.includes('.') || segments.includes('..')) {
      addError(fieldName, 'Path must not contain . or .. segments');
    }
    const resolved = path.resolve(repoRoot, p);
    if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) {
      addError(fieldName, 'Path must not escape repository root');
    }
  };

  const relReceiptPath = path.relative(repoRoot, receiptPath).replace(/\\/g, '/');
  checkPath(relReceiptPath, 'receiptPath');

  if (!relReceiptPath.startsWith('reconstruction/historical/') || !relReceiptPath.endsWith('/receipt.json')) {
    addError('receiptPath', 'Receipt must be located in reconstruction/historical/ and named receipt.json');
  }

  const artifactRoot = relReceiptPath.substring(0, relReceiptPath.length - 13); // remove '/receipt.json'

  if (!inventory.includes(relReceiptPath)) {
    addError('inventory', `Receipt ${relReceiptPath} is not registered in accepted-artifacts.json`);
  }

  const storedPaths = new Set();

  for (let i = 0; i < receiptObj.restoredFiles.length; i++) {
    const file = receiptObj.restoredFiles[i];
    const sp = file.storedPath;
    
    checkPath(file.sourcePath, `restoredFiles[${i}].sourcePath`);
    checkPath(sp, `restoredFiles[${i}].storedPath`);
    
    // Convert to forward slashes for prefix checking
    const normalizedSp = sp.replace(/\\/g, '/');

    if (!normalizedSp.startsWith('reconstruction/historical/')) {
      addError(`restoredFiles[${i}].storedPath`, 'storedPath must be within reconstruction/historical/');
    }

    if (!normalizedSp.startsWith(artifactRoot + '/')) {
      addError(`restoredFiles[${i}].storedPath`, 'storedPath must be a strict descendant of the artifact root');
    }

    if (storedPaths.has(normalizedSp)) {
      addError(`restoredFiles[${i}].storedPath`, `Duplicate storedPath: ${normalizedSp}`);
    }
    storedPaths.add(normalizedSp);

    if (!inventory.includes(normalizedSp)) {
      addError(`restoredFiles[${i}].storedPath`, `storedPath is not registered in accepted-artifacts.json`);
    }

    const srcExt = ACTIVE_EXTENSIONS.find(ext => file.sourcePath.endsWith(ext));
    if (srcExt) {
      const storedExt = ACTIVE_EXTENSIONS.find(ext => normalizedSp.endsWith(ext));
      if (storedExt) {
        addError(`restoredFiles[${i}].storedPath`, `Active script extension not allowed for storedPath`);
      }
    }

    const absoluteSp = path.resolve(repoRoot, sp);
    if (!fs.existsSync(absoluteSp)) {
      addError(`restoredFiles[${i}].storedPath`, `File does not exist: ${sp}`);
      continue;
    }
    
    const stats = fs.lstatSync(absoluteSp);
    if (stats.isSymbolicLink()) {
      addError(`restoredFiles[${i}].storedPath`, `File is a symbolic link: ${sp}`);
      continue;
    }
    
    if (!stats.isFile()) {
      addError(`restoredFiles[${i}].storedPath`, `File is not a regular file: ${sp}`);
      continue;
    }

    const realPath = fs.realpathSync(absoluteSp);
    if (!realPath.startsWith(repoRoot + path.sep)) {
      addError(`restoredFiles[${i}].storedPath`, `File realpath escapes repository: ${sp}`);
    }

    if (stats.size !== file.sizeBytes) {
      addError(`restoredFiles[${i}].sizeBytes`, `Size mismatch. Expected ${file.sizeBytes}, actual ${stats.size}`);
    }

    const fileBuffer = fs.readFileSync(absoluteSp);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    if (hash !== file.sha256) {
      addError(`restoredFiles[${i}].sha256`, `SHA-256 mismatch. Expected ${file.sha256}, actual ${hash}`);
    }
  }

  const inventoryDescendants = inventory.filter(entry => entry.startsWith(artifactRoot + '/') && entry !== relReceiptPath);
  for (const entry of inventoryDescendants) {
    if (!storedPaths.has(entry)) {
      addError('inventory.reverseBinding', `Inventory entry under receipt artifact root is not declared in restoredFiles: ${entry}`);
    }
  }

  return result;
}

module.exports = {
  validateReceipt
};
