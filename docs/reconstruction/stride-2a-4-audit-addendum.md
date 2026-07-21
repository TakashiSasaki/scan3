# Stride 2A.4 Audit Addendum

This document captures findings from the audit of Stride 2A.4, informing the corrective actions in Stride 2A.5.

## Regressions & Findings
1. **Verification Pipeline Gap**: `scripts/validate-ci-workflow.cjs` and `scripts/validate-agent-skills.cjs` existed but were not connected to the `verify:reconstruction` pipeline, meaning their checks could be bypassed.
2. **Contract Validator Mutation**: The contract validator `scripts/validate-source-packet-contract.cjs` invoked `generate-source-packet-constraint-matrix.cjs` directly, mutating the filesystem during validation rather than running side-effect-free comparisons.
3. **Incomplete Constraints**: Several key constraints expressible in the JSON schema or checked in operational validation were missing from the machine-readable `source-packet-constraints.json` matrix.
4. **Guardrail Self-Protection Gap**: The artifact inventory did not verify the presence of `agent-skills.json` or the new control validator. Coverage for certain negative test scenarios (e.g. self-reference missing, duplicate paths) was inadequate.
5. **Skill Discoverability**: Repository-local skills were defined but not referenced in `AGENTS.md`, leaving them invisible to default agent context.
6. **Transient Root Scripts**: A temporary script (`update-inventory.js`) was left in the root directory.

## Required Corrective Actions (Stride 2A.5)
- Establish "Verification Pipeline Closure" and connect all validators to the main `verify` script.
- Update `generate-source-packet-constraint-matrix.cjs` to support in-memory string generation, and adapt `validate-source-packet-contract.cjs` for read-only validation.
- Register all missing operational and schema constraints into the constraint JSON.
- Restore rigorous artifact test coverage.
- Remove root transient scripts.
- Introduce Baseline Preflight logic to protect against one-way export failures.
