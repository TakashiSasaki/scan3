const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../src/app/router/surfaceCatalog.json');

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
} catch (e) {
  console.error('Failed to read surfaceCatalog.json');
  process.exit(1);
}

const requiredPaths = [
  '/',
  '/app',
  '/app/legacy',
  '/admin',
  '/dev',
  '/dev/schema',
  '/api',
  '/test',
  '/demo'
];

const paths = new Set();
const ids = new Set();
let allPassed = true;

for (const entry of catalog) {
  if (!entry.id) { console.error(`FAIL: Missing id`); allPassed = false; }
  if (ids.has(entry.id)) { console.error(`FAIL: Duplicate id: ${entry.id}`); allPassed = false; }
  ids.add(entry.id);

  if (!entry.path) { console.error(`FAIL: Missing path`); allPassed = false; }
  if (paths.has(entry.path)) { console.error(`FAIL: Duplicate path in catalog: ${entry.path}`); allPassed = false; }
  if (!entry.path.startsWith('/')) { console.error(`FAIL: Path must start with /: ${entry.path}`); allPassed = false; }
  if (entry.path.endsWith('/') && entry.path !== '/') { console.error(`FAIL: Path must not end with /: ${entry.path}`); allPassed = false; }
  
  if (!entry.label) { console.error(`FAIL: Missing label for ${entry.path}`); allPassed = false; }
  if (!entry.description) { console.error(`FAIL: Missing description for ${entry.path}`); allPassed = false; }
  if (!entry.status) { console.error(`FAIL: Missing status for ${entry.path}`); allPassed = false; }
  if (typeof entry.shortcutVisible !== 'boolean') { console.error(`FAIL: shortcutVisible must be boolean for ${entry.path}`); allPassed = false; }

  paths.add(entry.path);
}

for (const req of requiredPaths) {
  if (!paths.has(req)) {
    console.error(`FAIL: Missing required path in catalog: ${req}`);
    allPassed = false;
  }
}

// Shortcut validation
for (const entry of catalog) {
  if (entry.path === '/' && entry.shortcutVisible) {
    console.error(`FAIL: "/" must not be shortcut visible`);
    allPassed = false;
  }
}
const devShortcutsPath = path.join(__dirname, '../src/app/components/DevelopmentShortcuts.tsx');
if (!fs.existsSync(devShortcutsPath)) {
  console.error(`FAIL: DevelopmentShortcuts.tsx not found`);
  allPassed = false;
} else {
  const devShortcutsContent = fs.readFileSync(devShortcutsPath, 'utf-8');
  if (!devShortcutsContent.includes('catalog.filter')) {
    console.error(`FAIL: DevelopmentShortcuts must use catalog data`);
    allPassed = false;
  }
  const linkMatches = devShortcutsContent.match(/<Link to="\/[^"]*"/g);
  if (linkMatches) {
    console.error(`FAIL: Shortcut path is hardcoded in component`);
    allPassed = false;
  }
}

const appTsxPath = path.join(__dirname, '../src/App.tsx');
let appTsx = fs.readFileSync(appTsxPath, 'utf-8');

const routeRegex = /<Route[^>]*path="([^"]+)"/g;
const routerPaths = new Set();
let match;
while ((match = routeRegex.exec(appTsx)) !== null) {
  const p = match[1];
  if (routerPaths.has(p)) {
    console.error(`FAIL: Duplicate route path in App.tsx: ${p}`);
    allPassed = false;
  }
  routerPaths.add(p);
}

for (const p of paths) {
  if (!routerPaths.has(p)) {
    console.error(`FAIL: Path in catalog not found in App.tsx router: ${p}`);
    allPassed = false;
  }
}
for (const p of routerPaths) {
  if (!paths.has(p)) {
    console.error(`FAIL: Path in App.tsx router not found in catalog: ${p}`);
    allPassed = false;
  }
}
for (const req of requiredPaths) {
  if (!routerPaths.has(req)) {
    console.error(`FAIL: Missing required path in App.tsx router: ${req}`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('Surface validation passed.');
}
