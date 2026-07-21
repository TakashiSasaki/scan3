# Stride 2A.7 Audit Addendum

## Context & Audit Findings
During Stride 2A.7 closeout review, the following improvements were identified to harden the reconstruction verification pipeline:

1. **Capability Error Semantics**:
   - `scripts/validate-source-packet.cjs` was updated so that dangling symbolic link detection via `fs.realpathSync` specifically checks for `e.code === 'ENOENT'` or `e.code === 'ELOOP'`.
   - Unknown filesystem errors are rethrown as fatal validator failures rather than being misclassified as generic skips.

2. **Failure-Mode Evidence Verification**:
   - `reconstruction/source-packet-fixture-expectations.json` and `reconstruction/source-packet-dynamic-test-expectations.json` were enhanced to record exact `expectedErrorCode` for operational failure branches and `expectedSchemaKeyword` / `expectedSchemaPath` for schema failure branches.
   - `scripts/test-source-packet-validator.cjs` and `scripts/test-source-packet-schema.cjs` extract actual error codes and Ajv error keywords/paths to guarantee exact error code matches instead of partial string searching.

3. **Registry Integrity & Bidirectional Verification**:
   - `scripts/validate-control-registries.cjs` was upgraded to enforce strict validation across all control registries:
     - All `allowedSkipReasons` must be trimmed, non-empty, and unique.
     - All `expectedErrorCode` entries must be valid registered `OperationalError` codes.
     - Exact match between constraint `operationalEvidence.marker` and fixture/test `expectedErrorCode`.
     - Exact match between constraint `schemaPointer` and fixture `expectedSchemaPath`.
     - Disallow name collisions between static fixtures and dynamic tests.
     - Strict `authoritativeLayer` enforcement (`schema` has `schemaPointer` only, `operational` has `operationalEvidence` only, `both` has both).

4. **Guardrail Closure & Inventory Protection**:
   - `reconstruction/accepted-artifacts.json` and `scripts/validate-accepted-artifacts.cjs` were expanded to cover all dynamic test registries, audit addenda, and closeout documents.

## Compliance
- All tests pass with zero skips (`SKIP: 0`).
- Baseline provenance `142d1edb82e0f3adc470bd09d3b80dcebbf0c4b3` preserved.
