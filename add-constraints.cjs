const fs = require('fs');
const path = require('path');

const constraintsPath = path.join(__dirname, 'reconstruction/source-packet-constraints.json');
let constraints = JSON.parse(fs.readFileSync(constraintsPath, 'utf8'));

const missing = [
  {
    "id": "C-FORMAT",
    "description": "formatVersion must be 1.0",
    "authoritativeLayer": "schema",
    "schemaPointer": "/properties/formatVersion/const",
    "operationalEvidence": null,
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-REQ-1",
    "description": "Required fields at top level",
    "authoritativeLayer": "schema",
    "schemaPointer": "/required",
    "operationalEvidence": null,
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-TYPE-STR",
    "description": "Non-blank string type",
    "authoritativeLayer": "schema",
    "schemaPointer": "/definitions/nonBlankString/pattern",
    "operationalEvidence": null,
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-TYPE-SHA1",
    "description": "Commit SHA type",
    "authoritativeLayer": "schema",
    "schemaPointer": "/definitions/fullCommitSha/pattern",
    "operationalEvidence": null,
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-TYPE-SHA256",
    "description": "SHA-256 type",
    "authoritativeLayer": "schema",
    "schemaPointer": "/definitions/sha256/pattern",
    "operationalEvidence": null,
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-TYPE-INT",
    "description": "Safe integer for sizeBytes",
    "authoritativeLayer": "schema",
    "schemaPointer": "/definitions/fileEntry/properties/sizeBytes/type",
    "operationalEvidence": null,
    "fixtures": ["minimal", "invalid-noninteger-size"],
    "status": "implemented"
  },
  {
    "id": "C-ENUM-DISP",
    "description": "Disposition enum",
    "authoritativeLayer": "schema",
    "schemaPointer": "/definitions/fileEntry/properties/disposition/enum",
    "operationalEvidence": null,
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-REQ-OWNER",
    "description": "Owner decision missing value",
    "authoritativeLayer": "schema",
    "schemaPointer": "/definitions/ownerDecision/properties/value",
    "operationalEvidence": null,
    "fixtures": ["minimal", "invalid-missing-owner-value"],
    "status": "implemented"
  },
  {
    "id": "C-PAYLOAD-SIZE",
    "description": "Actual file size match",
    "authoritativeLayer": "operational",
    "schemaPointer": null,
    "operationalEvidence": {
      "file": "scripts/validate-source-packet.cjs",
      "marker": "Size mismatch for"
    },
    "fixtures": ["invalid-size"],
    "status": "implemented"
  },
  {
    "id": "C-PAYLOAD-HASH",
    "description": "Actual file hash match",
    "authoritativeLayer": "operational",
    "schemaPointer": null,
    "operationalEvidence": {
      "file": "scripts/validate-source-packet.cjs",
      "marker": "SHA-256 mismatch for"
    },
    "fixtures": ["invalid-hash"],
    "status": "implemented"
  },
  {
    "id": "C-PAYLOAD-REGULAR",
    "description": "Payload must be a regular file",
    "authoritativeLayer": "operational",
    "schemaPointer": null,
    "operationalEvidence": {
      "file": "scripts/validate-source-packet.cjs",
      "marker": "Payload is not a regular file for"
    },
    "fixtures": ["minimal"],
    "status": "implemented"
  },
  {
    "id": "C-PAYLOAD-NO-SYMLINK",
    "description": "Payload must not be a symbolic link",
    "authoritativeLayer": "operational",
    "schemaPointer": null,
    "operationalEvidence": {
      "file": "scripts/validate-source-packet.cjs",
      "marker": "Payload is a symbolic link for"
    },
    "fixtures": ["symbolic-link-test"],
    "status": "implemented"
  }
];

// Append missing ones
for (const m of missing) {
  if (!constraints.some(c => c.id === m.id)) {
    constraints.push(m);
  }
}

fs.writeFileSync(constraintsPath, JSON.stringify(constraints, null, 2));
