const fs = require('fs');
const path = require('path');

function generateMatrix() {
  const constraintsPath = path.join(__dirname, '../reconstruction/source-packet-constraints.json');
  const constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));

  let md = `# Source Packet Constraint Matrix\n\n`;
  md += `This file is generated from \`source-packet-constraints.json\`. Do not edit manually.\n\n`;
  md += `| ID | Description | Status | Authoritative Layer | Schema Fixtures | Operational Tests |\n`;
  md += `|----|-------------|--------|---------------------|-----------------|-------------------|\n`;

  for (const c of constraints) {
    const schemaFixtures = (c.schemaFixtures || []).join(', ') || '-';
    const operationalTests = (c.operationalTests || []).join(', ') || '-';
    md += `| ${c.id} | ${c.description} | ${c.status} | ${c.authoritativeLayer} | ${schemaFixtures} | ${operationalTests} |\n`;
  }
  
  return md;
}

if (require.main === module) {
  const matrixPath = path.join(__dirname, '../reconstruction/source-packet-constraint-matrix.md');
  fs.writeFileSync(matrixPath, generateMatrix());
  console.log('Matrix generated at ' + matrixPath);
}

module.exports = { generateMatrix };
