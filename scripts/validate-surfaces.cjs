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
let allPassed = true;

for (const entry of catalog) {
  if (paths.has(entry.path)) {
    console.error(`FAIL: Duplicate path in catalog: ${entry.path}`);
    allPassed = false;
  }
  if (!entry.path.startsWith('/')) {
    console.error(`FAIL: Path must start with /: ${entry.path}`);
    allPassed = false;
  }
  if (entry.path.endsWith('/') && entry.path !== '/') {
    console.error(`FAIL: Path must not end with /: ${entry.path}`);
    allPassed = false;
  }
  paths.add(entry.path);
}

for (const req of requiredPaths) {
  if (!paths.has(req)) {
    console.error(`FAIL: Missing required path in catalog: ${req}`);
    allPassed = false;
  }
}

const appTsxPath = path.join(__dirname, '../src/App.tsx');
let appTsx = fs.readFileSync(appTsxPath, 'utf-8');

const legacyRouteMatch = appTsx.match(/<Route[^>]*path="\/app\/legacy"/);
const appRouteMatch = appTsx.match(/<Route[^>]*path="\/app"/);

if (!legacyRouteMatch || !appRouteMatch) {
  console.error('FAIL: Missing /app or /app/legacy routes in App.tsx');
  allPassed = false;
} else {
  // 順序の確認：/app/legacyが先に来るべき（React Routerでは仕様により問題ないが、指示に従い順序を確認する）
  if (legacyRouteMatch.index > appRouteMatch.index) {
    console.error('FAIL: /app/legacy must be defined before /app in App.tsx to avoid being absorbed.');
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('Surface validation passed.');
}
