const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      return [dir];
    }
  } catch (e) {
    return [];
  }

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

const target = process.argv[2] || 'src';
const targetPath = path.resolve(process.cwd(), target);

const files = walk(targetPath);
let allPassed = true;

const residuePatterns = [
  // Spacing (padding, margin)
  /\bclassName="[^"]*(?:\s|^)p-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)px-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)py-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)m-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)mb-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)mt-[0-9]+(?:\s|")[^"]*"/,
  // Typography sizes
  /\bclassName="[^"]*(?:\s|^)text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)font-bold(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)font-semibold(?:\s|")[^"]*"/,
  // Colors with numeric shades
  /\bclassName="[^"]*(?:\s|^)text-[a-z]+-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)bg-[a-z]+-[0-9]+(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)border-[a-z]+-[0-9]+(?:\s|")[^"]*"/,
  // Border radius exact scales
  /\bclassName="[^"]*(?:\s|^)rounded(?:\s|")[^"]*"/,
  /\bclassName="[^"]*(?:\s|^)rounded-(sm|md|lg|xl|2xl|3xl|full)(?:\s|")[^"]*"/,
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
