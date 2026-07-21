const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    throw new Error(`${fieldName} escapes root directory: ${relativePath}`);
  }
  if (resolved === rootDir) {
    throw new Error(`${fieldName} points to the root directory itself: ${relativePath}`);
  }
  return resolved;
}

function validateExistingRegularPayloadFile(payloadFullPath, payloadDirFullPath, payloadDirReal, fieldName) {
  if (!fs.existsSync(payloadFullPath)) {
    throw new Error(`Payload file not found for ${fieldName}: ${payloadFullPath}`);
  }
  let currentPath = payloadFullPath;
  while (currentPath !== payloadDirFullPath && currentPath !== path.parse(currentPath).root) {
    if (fs.lstatSync(currentPath).isSymbolicLink()) {
       throw new Error(`Payload path contains symbolic link for ${fieldName}: ${payloadFullPath}`);
    }
    currentPath = path.dirname(currentPath);
  }
  const stat = fs.lstatSync(payloadFullPath);
  if (!stat.isFile()) {
    throw new Error(`Payload is not a regular file for ${fieldName}: ${payloadFullPath}`);
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`Payload is a symbolic link for ${fieldName}: ${payloadFullPath}`);
  }
  const payloadFileReal = fs.realpathSync(payloadFullPath);
  if (!payloadFileReal.startsWith(payloadDirReal + path.sep)) {
    throw new Error(`Payload real path escapes payload root for ${fieldName}: ${payloadFullPath}`);
  }
  return stat;
}

function validate() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node validate-source-packet.cjs <packet-dir-or-manifest>');
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

  if (manifest.formatVersion !== "1.0") throw new Error('formatVersion must be "1.0"');
  if (typeof manifest.packetId !== 'string' || !manifest.packetId.trim()) throw new Error('packetId must be a non-empty string');
  if (typeof manifest.purpose !== 'string' || !manifest.purpose.trim()) throw new Error('purpose must be a non-empty string');

  if (!manifest.source || typeof manifest.source !== 'object' || Array.isArray(manifest.source)) throw new Error('source must be an object');
  if (typeof manifest.source.repository !== 'string' || !manifest.source.repository.trim()) throw new Error('source.repository must be a non-empty string');
  if (typeof manifest.source.commit !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.source.commit)) throw new Error('source.commit must be 40-character lowercase hex SHA');

  if (!manifest.destination || typeof manifest.destination !== 'object' || Array.isArray(manifest.destination)) throw new Error('destination must be an object');
  if (manifest.destination.repository !== 'TakashiSasaki/scan3') throw new Error('destination.repository must be strictly "TakashiSasaki/scan3"');
  if (typeof manifest.destination.baselineCommit !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.destination.baselineCommit)) throw new Error('destination.baselineCommit must be 40-character lowercase hex SHA');

  if (!Array.isArray(manifest.files)) throw new Error('files must be an array');
  if (!Array.isArray(manifest.ownerDecisions)) throw new Error('ownerDecisions must be an array');

  const seenPayloadPaths = new Set();
  const seenSourcePaths = new Set();
  const seenDestinations = new Set();
  const seenDecisionIds = new Set();

  for (const decision of manifest.ownerDecisions) {
    if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new Error('ownerDecision must be a plain object');
    if (typeof decision.id !== 'string' || !decision.id.trim()) throw new Error('ownerDecision id must be a non-empty string');
    if (typeof decision.reason !== 'string' || !decision.reason.trim()) throw new Error('ownerDecision reason must be a non-empty string');
    if (!('value' in decision)) throw new Error(`ownerDecision missing 'value' property: ${decision.id}`);
    if (seenDecisionIds.has(decision.id)) throw new Error(`Duplicate ownerDecision id: ${decision.id}`);
    seenDecisionIds.add(decision.id);
  }

  const payloadDirFullPath = path.resolve(packetDir, 'payload');
  if (!fs.existsSync(payloadDirFullPath)) throw new Error(`Payload root directory does not exist: ${payloadDirFullPath}`);
  if (fs.lstatSync(payloadDirFullPath).isSymbolicLink()) {
    throw new Error(`Payload root directory must not be a symbolic link`);
  }
  const payloadDirReal = fs.realpathSync(payloadDirFullPath);

  for (const file of manifest.files) {
    if (!file || typeof file !== 'object' || Array.isArray(file)) throw new Error('File entry must be a plain object');
    
    validateRawRelativePath(file.sourcePath, 'sourcePath');
    validateRawRelativePath(file.payloadPath, 'payloadPath');
    
    if (seenSourcePaths.has(file.sourcePath)) throw new Error(`Duplicate sourcePath: ${file.sourcePath}`);
    if (seenPayloadPaths.has(file.payloadPath)) throw new Error(`Duplicate payloadPath: ${file.payloadPath}`);
    seenSourcePaths.add(file.sourcePath);
    seenPayloadPaths.add(file.payloadPath);

    if (file.notes !== undefined && typeof file.notes !== 'string') {
      throw new Error(`Invalid notes type for ${file.payloadPath}`);
    }

    if (file.intendedDestination !== undefined && file.intendedDestination !== null && typeof file.intendedDestination !== 'string') {
      throw new Error(`Invalid intendedDestination type for ${file.payloadPath}`);
    }

    if (typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.sha256)) throw new Error(`sha256 must be a 64-character lowercase hex string for ${file.payloadPath}`);

    const payloadFullPath = resolveContainedPath(payloadDirFullPath, file.payloadPath, 'payloadPath');
    const stat = validateExistingRegularPayloadFile(payloadFullPath, payloadDirFullPath, payloadDirReal, file.payloadPath);

    if (typeof file.sizeBytes !== 'number' || !Number.isFinite(file.sizeBytes) || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0) {
      throw new Error(`Invalid sizeBytes for ${file.payloadPath}`);
    }
    if (stat.size !== file.sizeBytes) throw new Error(`Size mismatch for ${file.payloadPath}: expected ${file.sizeBytes}, got ${stat.size}`);
    
    const fileBuffer = fs.readFileSync(payloadFullPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    if (hex !== file.sha256) throw new Error(`SHA-256 mismatch for ${file.payloadPath}: expected ${file.sha256}, got ${hex}`);

    if (typeof file.disposition !== 'string') throw new Error(`disposition must be a string for ${file.payloadPath}`);
    const allowedDispositions = ['restore', 'reference', 'exclude'];
    if (!allowedDispositions.includes(file.disposition)) throw new Error(`Invalid disposition for ${file.payloadPath}: ${file.disposition}`);

    if (file.disposition === 'restore') {
      if (!file.intendedDestination) throw new Error(`restore file ${file.payloadPath} is missing intendedDestination`);
    }

    if (file.intendedDestination) {
      validateRawRelativePath(file.intendedDestination, 'intendedDestination');
      if (file.disposition === 'restore') {
        if (seenDestinations.has(file.intendedDestination)) {
          throw new Error(`Duplicate intendedDestination for restore: ${file.intendedDestination}`);
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
