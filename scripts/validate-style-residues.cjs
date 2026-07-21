const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js') || full.endsWith('.jsx')) {
        results.push(full);
      }
    }
  }
  return results;
}

const files = walk(path.join(__dirname, '../src'));
let allPassed = true;

const residuePatterns = [
  /\bclassName="[^"]*\bp-[0-9]+\b[^"]*"/,
  /\bclassName="[^"]*\bpx-[0-9]+\b[^"]*"/,
  /\bclassName="[^"]*\bpy-[0-9]+\b[^"]*"/,
  /\bclassName="[^"]*\bm-[0-9]+\b[^"]*"/,
  /\bclassName="[^"]*\bmb-[0-9]+\b[^"]*"/,
  /\bclassName="[^"]*\bmt-[0-9]+\b[^"]*"/,
  /\bclassName="[^"]*\btext-[a-z0-9-]+\b[^"]*"/,
  /\bclassName="[^"]*\bfont-bold\b[^"]*"/,
  /\bclassName="[^"]*\bfont-semibold\b[^"]*"/,
  /\bclassName="[^"]*\bbg-[a-z0-9-]+\b[^"]*"/,
  /\bclassName="[^"]*\brounded-[a-z0-9-]*\b[^"]*"/,
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  for (const pattern of residuePatterns) {
    if (pattern.test(content)) {
      console.error(`FAIL: Style residue found in ${file}`);
      console.error(`Matched pattern: ${pattern}`);
      allPassed = false;
    }
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('Style residue validation passed.');
}
