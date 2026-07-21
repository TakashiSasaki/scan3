const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createValidator } = require('./lib/source-packet-schema-validator.cjs');

class OperationalError extends Error {
  constructor(code, message) {
    super(`[${code}] ${message}`);
    this.code = code;
  }
}

// Defensive assertion for file system security boundary.
// Even though the schema checks regex, we perform JS-level path validation 
// before touching the real filesystem to prevent subtle bypassing.
function validateRawRelativePath(pathValue, fieldName) {
  if (typeof pathValue !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  const trimmed = pathValue.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} must not be empty`);
  }
  if (pathValue.includes('\0')) {
    throw new Error(`${fieldName} must not contain NUL characters`);
  }
  if (path.isAbsolute(pathValue)) {
    throw new Error(`${fieldName} must not be an absolute path: ${pathValue}`);
  }
  if (/^[a-zA-Z]:/.test(pathValue)) {
    throw new Error(`${fieldName} must not be a drive-letter path: ${pathValue}`);
  }
  if (pathValue.startsWith('\\\\')) {
    throw new Error(`${fieldName} must not be a UNC path: ${pathValue}`);
  }

  const segments = pathValue.split(/[/\\]/);
  if (segments.includes('.')) {
    throw new Error(`${fieldName} must not contain '.' segments: ${pathValue}`);
  }
  if (segments.includes('..')) {
    throw new Error(`${fieldName} must not contain '..' segments: ${pathValue}`);
  }
  return pathValue;
}

function resolveContainedPath(rootDir, relativePath, fieldName) {
  const resolved = path.resolve(rootDir, relativePath);
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
    throw new OperationalError('PAYLOAD_REALPATH_ESCAPE', `${fieldName} escapes root directory: ${relativePath}`);
  }
  if (resolved === rootDir) {
    throw new OperationalError('PAYLOAD_REALPATH_ESCAPE', `${fieldName} points to the root directory itself: ${relativePath}`);
  }
  return resolved;
}

function validateExistingRegularPayloadFile(payloadFullPath, payloadDirFullPath, payloadDirReal, fieldName) {
  let stat;
  try {
    stat = fs.lstatSync(payloadFullPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new OperationalError('PAYLOAD_FILE_MISSING', `Payload file not found for ${fieldName}: ${payloadFullPath}`);
    }
    throw e;
  }

  if (stat.isSymbolicLink()) {
    let realPath;
    try {
      realPath = fs.realpathSync(payloadFullPath);
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'ELOOP') {
        throw new OperationalError('PAYLOAD_FILE_SYMLINK', `Payload is a dangling symbolic link for ${fieldName}: ${payloadFullPath}`);
      }
      throw e;
    }
    if (!realPath.startsWith(payloadDirReal + path.sep) && realPath !== payloadDirReal) {
      throw new OperationalError('PAYLOAD_REALPATH_ESCAPE', `Payload real path escapes payload root for ${fieldName}: ${payloadFullPath}`);
    }
    throw new OperationalError('PAYLOAD_FILE_SYMLINK', `Payload is a symbolic link for ${fieldName}: ${payloadFullPath}`);
  }

  const payloadFileReal = fs.realpathSync(payloadFullPath);
  if (!payloadFileReal.startsWith(payloadDirReal + path.sep)) {
    throw new OperationalError('PAYLOAD_REALPATH_ESCAPE', `Payload real path escapes payload root for ${fieldName}: ${payloadFullPath}`);
  }

  let currentPath = path.dirname(payloadFullPath);
  while (currentPath !== payloadDirFullPath && currentPath !== path.parse(currentPath).root) {
    if (fs.lstatSync(currentPath).isSymbolicLink()) {
       throw new OperationalError('PAYLOAD_ANCESTOR_SYMLINK', `Payload path contains symbolic link for ${fieldName}: ${payloadFullPath}`);
    }
    currentPath = path.dirname(currentPath);
  }

  if (!stat.isFile()) {
    throw new OperationalError('PAYLOAD_NOT_REGULAR_FILE', `Payload is not a regular file for ${fieldName}: ${payloadFullPath}`);
  }
  return stat;
}

function validate() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node validate-source-packet.cjs <packet-dir-or-manifest>');
    process.exit(1);
  }
  if (!fs.existsSync(target)) {
    console.error(`Target not found: ${target}`);
    process.exit(1);
  }
  const isDir = fs.statSync(target).isDirectory();
  const manifestPath = isDir ? path.join(target, 'manifest.json') : target;
  const packetDir = isDir ? target : path.dirname(target);

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at: ${manifestPath}`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to parse manifest as JSON: ${e.message}`);
    process.exit(1);
  }

  // 1. JSON Schema validation
  const validator = createValidator();
  const { valid, errors } = validator.validateManifestSchema(manifest);
  if (!valid) {
    console.error("Schema validation failed:");
    console.error(JSON.stringify(errors, null, 2));
    process.exit(1);
  }

  // 2. Operational validation
  const seenPayloadPaths = new Set();
  const seenSourcePaths = new Set();
  const seenDestinations = new Set();
  const seenDecisionIds = new Set();

  for (const decision of manifest.ownerDecisions) {
    // Uniqueness is an operational constraint.
    if (seenDecisionIds.has(decision.id)) throw new OperationalError('DUPLICATE_OWNER_DECISION_ID', `Duplicate ownerDecision id: ${decision.id}`);
    seenDecisionIds.add(decision.id);
  }

  const payloadDirFullPath = path.resolve(packetDir, 'payload');
  let payloadDirStat;
  try {
    payloadDirStat = fs.lstatSync(payloadDirFullPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new OperationalError('PAYLOAD_ROOT_MISSING', `Payload root directory does not exist: ${payloadDirFullPath}`);
    }
    throw e;
  }
  
  if (payloadDirStat.isSymbolicLink()) {
    throw new OperationalError('PAYLOAD_ROOT_SYMLINK', `Payload root directory must not be a symbolic link`);
  }
  if (!payloadDirStat.isDirectory()) {
    throw new OperationalError('PAYLOAD_ROOT_NOT_DIRECTORY', `Payload root must be a directory`);
  }
  const payloadDirReal = fs.realpathSync(payloadDirFullPath);

  for (const file of manifest.files) {
    // Defensive assertion before interacting with file system
    validateRawRelativePath(file.sourcePath, 'sourcePath');
    validateRawRelativePath(file.payloadPath, 'payloadPath');
    
    if (seenSourcePaths.has(file.sourcePath)) throw new OperationalError('DUPLICATE_SOURCE_PATH', `Duplicate sourcePath: ${file.sourcePath}`);
    if (seenPayloadPaths.has(file.payloadPath)) throw new OperationalError('DUPLICATE_PAYLOAD_PATH', `Duplicate payloadPath: ${file.payloadPath}`);
    seenSourcePaths.add(file.sourcePath);
    seenPayloadPaths.add(file.payloadPath);

    const payloadFullPath = resolveContainedPath(payloadDirFullPath, file.payloadPath, 'payloadPath');
    const stat = validateExistingRegularPayloadFile(payloadFullPath, payloadDirFullPath, payloadDirReal, file.payloadPath);

    if (stat.size !== file.sizeBytes) throw new OperationalError('PAYLOAD_SIZE_MISMATCH', `Size mismatch for ${file.payloadPath}: expected ${file.sizeBytes}, got ${stat.size}`);
    
    const fileBuffer = fs.readFileSync(payloadFullPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    if (hex !== file.sha256) throw new OperationalError('PAYLOAD_HASH_MISMATCH', `SHA-256 mismatch for ${file.payloadPath}: expected ${file.sha256}, got ${hex}`);

    if (file.intendedDestination) {
      validateRawRelativePath(file.intendedDestination, 'intendedDestination');
      if (file.disposition === 'restore') {
        if (seenDestinations.has(file.intendedDestination)) {
          throw new OperationalError('DUPLICATE_RESTORE_DESTINATION', `Duplicate intendedDestination for restore: ${file.intendedDestination}`);
        }
        seenDestinations.add(file.intendedDestination);
      }
    }
  }
  console.log(`Successfully validated manifest: ${manifestPath}`);
}

try {
  validate();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
