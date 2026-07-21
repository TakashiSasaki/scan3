# Stride 2A.5 Audit Addendum

## 1. Context and Purpose
This document serves as an addendum to Stride 2A.5, detailing critical corrective actions and capability enhancements related to constraint validation, operational testing, and artifact verification.

## 2. Corrective Actions & Enhancements

### 2.1 Control Registries Strictness Enforcement
- Implemented rigorous schema-like property checks in `scripts/validate-control-registries.cjs`.
- Ensured that fixture catalogs and constraint entries strictly prohibit unknown properties.
- Enforced non-empty, trimmed strings for required string properties (such as `name`, `reason`).
- Validated constraint enum values (`implemented`, `deferred`, `not-implemented`) strictly.
- Enforced layer-specific schema pointers (`schemaPointer`) and operational evidence markers (`operationalEvidence`).
- Closed the skill registry structure against undocumented fields.

### 2.2 Operational Validator Test Restructuring
- Separated dynamic operational tests (`runDynamicTest`) from static schema tests within `scripts/test-source-packet-validator.cjs`.
- Introduced `OperationalError` with specific error codes (e.g., `PAYLOAD_ROOT_MISSING`, `PAYLOAD_FILE_SYMLINK`).
- Ensured that operational validation branches are directly verified using their intended failure error codes rather than depending on schema output parsing.

### 2.3 Symlink Constraint and Evidence Correction
- **Previous Misuse**: The static `symbolic-link-test` was previously used as dual evidence for both realpath containment escape (`PAYLOAD_REALPATH_ESCAPE`) and file symlink rejection (`PAYLOAD_FILE_SYMLINK`), which was architecturally flawed.
- **Correction**: Introduced dedicated dynamic tests (`invalid-payload-file-symlink-outside`, `invalid-payload-file-symlink-inside`, `invalid-payload-ancestor-symlink`). `symbolic-link-test` now correctly serves only as evidence for realpath containment escape alongside the new dynamic tests.

### 2.4 Artifact Path Validation Correction
- **Previous Flaw**: The test for `valid file..name.md` relied exclusively on filesystem resolution (e.g., whether `fs.existsSync` passed) rather than explicit path segment validation, defeating the purpose of the dot-segment constraint check for this edge case.
- **Correction**: Extracted the path segment validation logic into a dedicated, exported helper function (`validateArtifactPath`) in `scripts/validate-accepted-artifacts.cjs`. Added direct testing in `scripts/test-accepted-artifacts-validator.cjs` to explicitly bypass filesystem existence checks and assert the following rules:
  - `file..name.md` (PASS)
  - `dir/file..name.md` (PASS)
  - `dir/../file.md` (FAIL)
  - `dir/./file.md` (FAIL)
