const fs = require('fs');
const invPath = 'reconstruction/accepted-artifacts.json';
const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));

const add = [
  "docs/reconstruction/decisions.md",
  "docs/reconstruction/stride-2a-3-audit-addendum.md",
  "docs/reconstruction/stride-2a-4-closeout.md",
  "docs/reconstruction/ci.md",
  "docs/reconstruction/agent-skills.md",
  "package.json",
  "package-lock.json",
  "scripts/validate-contracts.cjs",
  "scripts/test-style-residue-validator.cjs",
  "scripts/fixtures/style-residues/valid-semantic.tsx",
  "scripts/fixtures/style-residues/invalid-tailwind.tsx",
  "reconstruction/source-packet-constraints.json",
  "scripts/generate-source-packet-constraint-matrix.cjs",
  "scripts/validate-agent-skills.cjs",
  "scripts/validate-ci-workflow.cjs",
  ".github/workflows/verify-reconstruction.yml",
  ".agents/skills/README.md",
  ".agents/skills/scan3-source-packet-contract/SKILL.md",
  ".agents/skills/scan3-stride-audit-closeout/SKILL.md"
];

for (const a of add) {
  if (!inv.includes(a)) {
    inv.push(a);
  }
}

fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
