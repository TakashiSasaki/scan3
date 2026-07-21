# Stride 2A.8 Audit Addendum

## Context & Audit Findings
During the Stride 2A.8 audit review, the following core enhancements were identified and implemented to harden schema and operational contract verification:

1. **Operational Error Code Centralization**:
   - Created `/scripts/lib/operational-error-codes.cjs` as the single authoritative source of truth for valid `OperationalError` codes.
   - Updated `/scripts/validate-control-registries.cjs` to enforce that all `expectedErrorCode` entries in both static fixture catalogs and dynamic test registries refer strictly to registered codes.

2. **Strict Schema Failure Evidence Matching**:
   - Refactored `/scripts/test-source-packet-schema.cjs` to enforce strict exact equality checks on both `err.keyword` and `err.schemaPath` (with `#` prefix removed).
   - Eliminated partial string matches (`includes`, `startsWith`) in favor of exact normalized schema pointer equality.

3. **Schema vs Operational Test Separation**:
   - Refactored `/reconstruction/source-packet-constraints.json` to explicitly separate `schemaFixtures` and `operationalTests` for every constraint entry.
   - Updated `/scripts/generate-source-packet-constraint-matrix.cjs` to render `Schema Fixtures` and `Operational Tests` in separate columns in `/reconstruction/source-packet-constraint-matrix.md`.
   - Enhanced `/scripts/validate-source-packet-contract.cjs` to enforce layer-specific fixture requirements (`schema` layer has `schemaFixtures` only, `operational` layer has `operationalTests` only, `both` has both, `deferred` has none).

4. **Negative Evidence Expansion**:
   - Expanded static negative fixtures in `/reconstruction/examples/` (including `invalid-negative-size`, `invalid-large-size`, `invalid-empty-string`, `invalid-blank-string`, missing top-level fields) to guarantee complete test coverage across all schema keywords and paths.

5. **State-Dependent Contract Validation**:
   - Upgraded `/scripts/validate-control-registries.cjs` to enforce strict state-dependent field rules:
     - `schemaExpected === 'FAIL'`: `expectedSchemaKeyword` and `expectedSchemaPath` are mandatory, `expectedErrorCode` is forbidden.
     - `schemaExpected === 'PASS'` and `operationalExpected === 'FAIL'`: `expectedErrorCode` is mandatory, schema failure fields are forbidden.
     - `PASS` fixtures: all error evidence fields are forbidden.
     - `SKIP_ALLOWED`: non-empty explicit reason is mandatory.
     - Bidirectional cross-checking ensuring all static fixtures and dynamic tests are referenced in the constraint matrix.

## Compliance
- All local automated tests pass with zero skips (`SKIP: 0`).
- Baseline provenance `5a212db350780401d5afa36ad757297f23619979` preserved.
