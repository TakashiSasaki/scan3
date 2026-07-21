const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  if (!manifest.packetId) throw new Error('packetId is empty');
  if (!manifest.purpose) throw new Error('purpose is empty');
  if (!manifest.source || !manifest.source.repository) throw new Error('source.repository is empty');
  if (!/^[0-9a-f]{40}$/.test(manifest.source.commit)) throw new Error('source.commit must be 40-character hex SHA');
  if (!manifest.destination || manifest.destination.repository !== 'TakashiSasaki/scan3') throw new Error('destination.repository must be "TakashiSasaki/scan3"');
  if (!/^[0-9a-f]{40}$/.test(manifest.destination.baselineCommit)) throw new Error('destination.baselineCommit must be 40-character hex SHA');
  if (!Array.isArray(manifest.files)) throw new Error('files must be an array');
  if (!Array.isArray(manifest.ownerDecisions)) throw new Error('ownerDecisions must be an array');

  const seenPayloadPaths = new Set();
  const seenSourcePaths = new Set();
  const seenDestinations = new Set();
  const seenDecisionIds = new Set();

  for (const decision of manifest.ownerDecisions) {
    if (!decision || typeof decision !== 'object') throw new Error('ownerDecision must be an object');
    if (!decision.id || typeof decision.id !== 'string') throw new Error('ownerDecision id must be a non-empty string');
    if (!decision.reason || typeof decision.reason !== 'string') throw new Error('ownerDecision reason must be a non-empty string');
    if (!('value' in decision)) throw new Error(`ownerDecision missing 'value' property: ${decision.id}`);
    if (seenDecisionIds.has(decision.id)) throw new Error(`Duplicate ownerDecision id: ${decision.id}`);
    seenDecisionIds.add(decision.id);
  }

  const isSafePath = (p) => {
    if (!p || typeof p !== 'string') return false;
    if (path.isAbsolute(p)) return false;
    if (/^[a-zA-Z]:/.test(p)) return false;
    if (p.startsWith('\\\\')) return false;
    if (/(^|\/|\\)\.\.(?=\/|\\|$)/.test(p)) return false;
    if (p === '.') return false;
    
    const normalized = path.normalize(p);
    if (normalized.startsWith('..') || normalized === '.') return false;
    if (path.isAbsolute(normalized)) return false;
    return true;
  };

  const packetDirReal = fs.realpathSync(packetDir);
  const payloadDirFullPath = path.resolve(packetDir, 'payload');
  if (!fs.existsSync(payloadDirFullPath)) throw new Error(`Payload root directory does not exist: ${payloadDirFullPath}`);
  
  if (fs.lstatSync(payloadDirFullPath).isSymbolicLink()) {
    throw new Error(`Payload root directory must not be a symbolic link`);
  }
  const payloadDirReal = fs.realpathSync(payloadDirFullPath);

  for (const file of manifest.files) {
    if (!file.sourcePath || typeof file.sourcePath !== 'string') throw new Error('File entry missing valid sourcePath');
    if (!file.payloadPath || typeof file.payloadPath !== 'string') throw new Error('File entry missing valid payloadPath');
    
    if (!isSafePath(file.sourcePath)) throw new Error(`Invalid sourcePath: ${file.sourcePath}`);
    if (!isSafePath(file.payloadPath)) throw new Error(`Invalid payloadPath: ${file.payloadPath}`);

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

    const payloadFullPath = path.resolve(packetDir, 'payload', file.payloadPath);
    
    if (!payloadFullPath.startsWith(payloadDirFullPath + path.sep) && payloadFullPath !== payloadDirFullPath) {
      throw new Error(`payloadPath escapes payload directory: ${file.payloadPath}`);
    }
    if (payloadFullPath === payloadDirFullPath) {
      throw new Error(`payloadPath points to the payload directory itself: ${file.payloadPath}`);
    }

    if (!fs.existsSync(payloadFullPath)) throw new Error(`Payload file not found: ${file.payloadPath}`);
    
    let currentPath = payloadFullPath;
    while (currentPath !== payloadDirFullPath && currentPath !== path.parse(currentPath).root) {
      if (fs.lstatSync(currentPath).isSymbolicLink()) {
         throw new Error(`Payload path contains symbolic link: ${file.payloadPath}`);
      }
      currentPath = path.dirname(currentPath);
    }

    const stat = fs.lstatSync(payloadFullPath);
    if (!stat.isFile()) throw new Error(`Payload is not a regular file: ${file.payloadPath}`);
    if (stat.isSymbolicLink()) throw new Error(`Payload is a symbolic link: ${file.payloadPath}`);

    const payloadFileReal = fs.realpathSync(payloadFullPath);
    if (!payloadFileReal.startsWith(payloadDirReal + path.sep)) {
      throw new Error(`Payload real path escapes payload root: ${file.payloadPath}`);
    }

    if (typeof file.sizeBytes !== 'number' || !Number.isFinite(file.sizeBytes) || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0) {
      throw new Error(`Invalid sizeBytes for ${file.payloadPath}`);
    }
    if (stat.size !== file.sizeBytes) throw new Error(`Size mismatch for ${file.payloadPath}: expected ${file.sizeBytes}, got ${stat.size}`);
    
    if (!/^[0-9a-f]{64}$/.test(file.sha256)) throw new Error(`sha256 must be 64-character lowercase hex for ${file.payloadPath}`);

    const fileBuffer = fs.readFileSync(payloadFullPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    if (hex !== file.sha256) throw new Error(`SHA-256 mismatch for ${file.payloadPath}: expected ${file.sha256}, got ${hex}`);

    const allowedDispositions = ['restore', 'reference', 'exclude'];
    if (!allowedDispositions.includes(file.disposition)) throw new Error(`Invalid disposition for ${file.payloadPath}: ${file.disposition}`);

    if (file.disposition === 'restore') {
      if (!file.intendedDestination) throw new Error(`restore file ${file.payloadPath} is missing intendedDestination`);
    }

    if (file.intendedDestination) {
      if (!isSafePath(file.intendedDestination)) {
        throw new Error(`Invalid intendedDestination for ${file.payloadPath}: ${file.intendedDestination}`);
      }
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
