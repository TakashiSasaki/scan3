const fs = require('fs');
const path = require('path');

function generateMatrix() {
  const constraintsPath = path.join(__dirname, '../reconstruction/source-packet-constraints.json');
  const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));

  let md = `# Source Packet Constraint Matrix\n\n`;
  md += `This file is generated from \`source-packet-constraints.json\`. Do not edit manually.\n\n`;
  md += `| ID | Description | Status | Authoritative Layer | Fixtures |\n`;
  md += `|----|-------------|--------|---------------------|----------|\n`;

  for (const c of constraints) {
    const fixtures = c.fixtures.join(', ') || '-';
    md += `| ${c.id} | ${c.description} | ${c.status} | ${c.authoritativeLayer} | ${fixtures} |\n`;
  }
  
  return md;
}

if (require.main === module) {
  const matrixPath = path.join(__dirname, '../reconstruction/source-packet-constraint-matrix.md');
  fs.writeFileSync(matrixPath, generateMatrix());
  console.log('Matrix generated at ' + matrixPath);
}

module.exports = { generateMatrix };
