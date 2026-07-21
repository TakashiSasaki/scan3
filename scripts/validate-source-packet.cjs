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
  if (!manifest.source || !manifest.source.repository) throw new Error('source.repository is empty');
  if (!/^[0-9a-f]{40}$/.test(manifest.source.commit)) throw new Error('source.commit must be 40-character hex SHA');
  if (!manifest.destination || manifest.destination.repository !== 'TakashiSasaki/scan3') throw new Error('destination.repository must be "TakashiSasaki/scan3"');
  if (!/^[0-9a-f]{40}$/.test(manifest.destination.baselineCommit)) throw new Error('destination.baselineCommit must be 40-character hex SHA');

  const seenPayloadPaths = new Set();
  const seenSourcePaths = new Set();

  for (const file of manifest.files) {
    if (!file.sourcePath || !file.payloadPath) throw new Error('File entry missing sourcePath or payloadPath');
    
    if (path.isAbsolute(file.sourcePath) || file.sourcePath.includes('..')) throw new Error(`Invalid sourcePath: ${file.sourcePath}`);
    if (path.isAbsolute(file.payloadPath) || file.payloadPath.includes('..')) throw new Error(`Invalid payloadPath: ${file.payloadPath}`);

    if (seenSourcePaths.has(file.sourcePath)) throw new Error(`Duplicate sourcePath: ${file.sourcePath}`);
    if (seenPayloadPaths.has(file.payloadPath)) throw new Error(`Duplicate payloadPath: ${file.payloadPath}`);
    seenSourcePaths.add(file.sourcePath);
    seenPayloadPaths.add(file.payloadPath);

    const payloadFullPath = path.join(packetDir, 'payload', file.payloadPath);
    if (!fs.existsSync(payloadFullPath)) throw new Error(`Payload file not found: ${file.payloadPath}`);

    const stat = fs.statSync(payloadFullPath);
    if (stat.size !== file.sizeBytes) throw new Error(`Size mismatch for ${file.payloadPath}: expected ${file.sizeBytes}, got ${stat.size}`);

    const fileBuffer = fs.readFileSync(payloadFullPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    if (hex !== file.sha256) throw new Error(`SHA-256 mismatch for ${file.payloadPath}: expected ${file.sha256}, got ${hex}`);

    const allowedDispositions = ['restore', 'reference', 'exclude'];
    if (!allowedDispositions.includes(file.disposition)) throw new Error(`Invalid disposition for ${file.payloadPath}: ${file.disposition}`);

    if (file.disposition === 'restore') {
      if (!file.intendedDestination) throw new Error(`restore file ${file.payloadPath} is missing intendedDestination`);
      if (path.isAbsolute(file.intendedDestination) || file.intendedDestination.includes('..')) {
        throw new Error(`Invalid intendedDestination for ${file.payloadPath}: ${file.intendedDestination}`);
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
