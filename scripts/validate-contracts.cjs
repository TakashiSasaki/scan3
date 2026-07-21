const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// application versionが 0.1.0 である
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.version !== '0.1.0') {
  console.error(`Error: package.json version must be 0.1.0, but got ${pkg.version}`);
  process.exit(1);
}

const registryPath = path.join(root, 'contracts/registry.json');
let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (e) {
  console.error(`Error: failed to parse registry.json`, e);
  process.exit(1);
}

registry.packages.forEach(pkg => {
  if (!pkg.id || !pkg.version || !pkg.status || !pkg.path) {
    console.error(`Error: registry entry missing required fields: ${JSON.stringify(pkg)}`);
    process.exit(1);
  }

  const contractPath = path.join(root, pkg.path);
  if (!fs.existsSync(contractPath)) {
    console.error(`Error: contract file not found at ${pkg.path}`);
    process.exit(1);
  }

  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  if (contract.version !== pkg.version) {
    console.error(`Error: version mismatch. registry=${pkg.version}, contract=${contract.version} in ${pkg.path}`);
    process.exit(1);
  }
});

const profilePath = path.join(root, 'contracts/profiles/schema-workbench.json');
let profile;
try {
  profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
} catch (e) {
  console.error(`Error: failed to parse schema-workbench.json`, e);
  process.exit(1);
}

profile.contracts.forEach(ref => {
  const found = registry.packages.find(p => p.id === ref.id && p.version === ref.version);
  if (!found) {
    console.error(`Error: profile references contract not found in registry: ${ref.id}@${ref.version}`);
    process.exit(1);
  }
});

console.log('Validation passed.');
