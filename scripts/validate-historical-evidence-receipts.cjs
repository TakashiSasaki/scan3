const fs = require('fs');
const path = require('path');
const { validateReceipt } = require('./lib/historical-evidence-receipt-validator.cjs');

const historicalDir = path.resolve(__dirname, '../reconstruction/historical');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (path.basename(file) === 'receipt.json') {
        results.push(file);
      }
    }
  });
  return results;
}

function main() {
  const receipts = walk(historicalDir);
  
  if (receipts.length === 0) {
    console.error('No receipt.json files found in reconstruction/historical/');
    process.exit(1);
  }

  let allValid = true;

  for (const receiptPath of receipts) {
    const result = validateReceipt(receiptPath);
    if (!result.valid) {
      allValid = false;
      const relPath = path.relative(path.resolve(__dirname, '..'), receiptPath);
      console.error(`FAIL: ${relPath}`);
      for (const err of result.errors) {
        console.error(`  - Field/Path: ${err.field}`);
        console.error(`    Error: ${err.message}`);
      }
    }
  }

  if (allValid) {
    console.log('Historical evidence receipt validation passed.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
