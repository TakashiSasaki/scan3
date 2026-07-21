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

const allowedStatuses = [
  'foundation',
  'planning',
  'awaiting-source',
  'placeholder',
  'draft',
  'awaiting-restoration'
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
  if (!allowedStatuses.includes(entry.status)) { console.error(`FAIL: Invalid status for ${entry.path}: ${entry.status}`); allPassed = false; }
  if (typeof entry.shortcutVisible !== 'boolean') { console.error(`FAIL: shortcutVisible must be boolean for ${entry.path}`); allPassed = false; }

  // Required shortcut coverage
  if (entry.path === '/') {
    if (entry.shortcutVisible !== false) {
      console.error(`FAIL: "/" must have shortcutVisible: false`);
      allPassed = false;
    }
  } else if (requiredPaths.includes(entry.path)) {
    if (entry.shortcutVisible !== true) {
      console.error(`FAIL: Required path ${entry.path} must have shortcutVisible: true`);
      allPassed = false;
    }
  }

  paths.add(entry.path);
}

for (const req of requiredPaths) {
  if (!paths.has(req)) {
    console.error(`FAIL: Missing required path in catalog: ${req}`);
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

// Shortcut placement regression check
function checkShortcutPlacement(filePath, shouldHaveShortcut) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasImport = content.includes('DevelopmentShortcuts');
  const hasRender = content.includes('<DevelopmentShortcuts');
  
  if (shouldHaveShortcut) {
    if (!hasImport) {
      console.error(`FAIL: ${filePath} must import DevelopmentShortcuts`);
      allPassed = false;
    }
    if (!hasRender) {
      console.error(`FAIL: ${filePath} must render <DevelopmentShortcuts`);
      allPassed = false;
    }
  } else {
    if (hasImport) {
      console.error(`FAIL: ${filePath} must NOT import DevelopmentShortcuts`);
      allPassed = false;
    }
    if (hasRender) {
      console.error(`FAIL: ${filePath} must NOT render <DevelopmentShortcuts`);
      allPassed = false;
    }
  }
}

checkShortcutPlacement(path.join(__dirname, '../src/App.tsx'), false);
checkShortcutPlacement(path.join(__dirname, '../src/app/surfaces/public/index.tsx'), true);

const surfacesDir = path.join(__dirname, '../src/app/surfaces');
const surfaceFolders = fs.readdirSync(surfacesDir);
for (const folder of surfaceFolders) {
  if (folder === 'public') continue;
  const indexPath = path.join(surfacesDir, folder, 'index.tsx');
  checkShortcutPlacement(indexPath, false);
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
