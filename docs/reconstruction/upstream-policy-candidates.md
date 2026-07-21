# Upstream Policy Candidates

This document records policy candidates identified during Stride 2A.1 Audit Remediation.

These are candidates for broader application across repositories. They are documented here because the current AI Studio workspace does not have access to directly update the `TakashiSasaki/agent-policy` repository. In the future, an external reviewer may port these candidates to `TakashiSasaki/agent-policy`.

The AI Studio agent itself has NOT updated the agent-policy repository.

## Policy Rules Added

1. **Accepted Artifact Preservation**: Explicitly protect existing artifacts such as READMEs, decision records, closeout documents, manifests, and test fixtures from implicit deletion. Past closeout documents must be preserved and not overwritten by subsequent Strides.
2. **Scope-Local UI Changes**: Confine route-specific UI changes to their appropriate surface areas, preventing them from leaking into the global layout (unless requested). Development-only UI must also be hidden in production.
3. **Verification Claim Integrity**: Ensure that closeout documents only claim properties to be "verified" if the validator script explicitly tests for those properties. For instance, catalog/router synchrony checks must be bidirectional.
4. **Implementation Status Accuracy**: Do not mislabel surface readiness states. Placeholders, planning areas, and un-restored legacy applications should be labeled truthfully across UI, catalog, and documentation.
5. **Security Validator Negative Coverage**: Develop negative fixtures for each significant rejection criteria. Path validations must check raw paths, normalized paths, and real paths, including symlink traversal checks. Expected failures must be confirmed explicitly in testing.

These guidelines are not unique to the `scan3` project and are broadly applicable to maintain integrity and prevent regression across other agentic developments.

### Validation Outcome Transparency
- PASS, FAIL, SKIP must be explicitly distinguished.
- SKIP must not be counted as PASS.
- A state with SKIP must not be described as "all tests passed".
- Record the exact number of PASS, FAIL, and SKIP cases along with their targets in closeout documents.
- Any items that cannot be verified due to environment constraints must remain documented as unverified.

### Guardrail Precision
- Static analysis must explicitly identify the prohibited targets.
- Guardrails must not over-reject legitimate semantic naming or future extensions.
- Guardrails must be accompanied by both positive and negative fixtures.
- It must be verified that not only invalid inputs are rejected, but valid inputs are accepted.
- The precise scope of the inspection rules must be recorded in the closeout document.

- Executable Specification Synchronization
- Self-Protecting Guardrails
- Decision-Gated Semantic Changes
- Verification Statement Consistency

(Note: Currently these are only adopted as local policies within scan3. AI Studio does not update TakashiSasaki/agent-policy. These are candidates for an external reviewer to port upstream later. They will be validated in scan3 before upstreaming.)

- Test Catalog Single Source
- Evidence-Backed Constraint Matrix
- Guardrail Dependency Closure
- Safe Child Process Invocation
- Decision Resolution Recording
- Procedural Skill Extraction
- Independent Verification Escalation

## Verification Pipeline Closure
- Ensure all relevant validators (schemas, contracts, tests, skills, controls) are connected to the central verification pipeline (e.g., verify:reconstruction).
- An unlinked validator provides no protective value and cannot be claimed as a control.

## Side-Effect-Free Validation
- Contract validation and evidence generation should be read-only during validation.
- Do not mutate the state, rewrite baseline files, or apply unapproved changes silently during the validation phase.
- Use in-memory comparisons or dry-runs for verifying artifact synchronization.

## Skill Activation and Enforcement
- Procedural skills MUST be referenced explicitly in `AGENTS.md` so that the agent context is aware of them.
- Ensure the skill structure (`SKILL.md`) follows the agreed schema.

## Transient Artifact Hygiene
- Avoid leaving temporary root scripts, intermediate outputs, or orphaned payload tests in the workspace after task completion.
- Temporary files must be cleaned up to prevent inventory drift and side-effects.

## Machine-Readable Control Validation
- Verify the integrity of control registries (fixture catalogs, constraint matrices, skill lists) through automated validators.
- Reject unknown fields, malformed formats, duplicate IDs, and unregistered target references.

## Exact Error Evidence Validation
- Schema error assertions MUST verify both the exact `keyword` and the normalized, exact `schemaPath` of Ajv validation errors. Loose string matching (`includes`, `startsWith`) is forbidden for schema error assertions.
- Operational error assertions MUST verify the exact registered `OperationalError` code.

## State-Dependent Expectation Cataloging
- Test fixture expectation catalogs MUST enforce state-dependent validation rules:
  - Failing schema fixtures require non-empty `expectedSchemaKeyword` and `expectedSchemaPath`, and forbid `expectedErrorCode`.
  - Failing operational fixtures require a registered `expectedErrorCode`, and forbid schema error fields.
  - Passing fixtures forbid all failure evidence fields.
  - Skipped fixtures require an explicit non-empty `reason`.

## One-Way Export Baseline Guard
- 一方向export前にworkspace baselineのsentinelを検査する。
- baseline mismatch時はexportを停止する。
- 不足artifactを会話履歴から推測して再作成しない。
- current priorityとaccepted artifactをexport前に検証する。
