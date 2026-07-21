# Regression Prevention Policy

This policy document defines rules to prevent recurrences of issues identified during Stride audits. It acts as an addendum to the main project policy.

## 1. Accepted Artifact Preservation

- Do not implicitly delete existing artifacts unless explicitly instructed to do so.
- Do not implicitly delete READMEs, decision records, closeout documents, manifests, policy files, or test fixtures.
- Preserve past Stride closeout documents as historical records.
- Do not replace or overwrite past Stride closeout documents with documents from a new Stride.
- Before completing a task, verify changes against the baseline to ensure no unintended deletions occurred.
- Any intentionally deleted files must be listed in the completion report with reasons.

## 2. Scope-Local UI Changes

- Do not place route-specific UI elements in the global layout unless explicitly requested.
- Verify that route-specific UI does not leak into other surface areas.
- Ensure that development-only UI is hidden in production builds.

## 3. Verification Claim Integrity

- Do not claim a property is "verified" unless the validator actually checks it.
- Limit verification claims in closeout documents strictly to the executed commands and their actual scope.
- When claiming synchronization between the catalog and router, compare all entries bidirectionally.
- Do not use reasoning that contradicts framework specifications to justify verification logic.
- Record unverified items explicitly as unverified or "SKIP".

## 4. Implementation Status Accuracy

- Do not describe a placeholder surface as "active" or "completed".
- Do not describe a surface in the "planning" state as "implemented".
- Do not describe an "awaiting-source" area as "restored".
- Maintain consistency between UI descriptions, catalog status, READMEs, and closeout documents.

## 5. Security Validator Negative Coverage

- Prepare negative fixtures for each primary rejection condition at security boundaries.
- For path security, validate raw paths, normalized paths, and real paths separately.
- Check for symbolic links, path traversals, invalid types, and duplicate identifiers.
- Explicitly verify that expected failures result in test success.

## 6. Validation Outcome Transparency
- PASS, FAIL, SKIP must be explicitly distinguished.
- SKIP must not be counted as PASS.
- A state with SKIP must not be described as "all tests passed".
- Record the exact number of PASS, FAIL, and SKIP cases along with their targets in closeout documents.
- Any items that cannot be verified due to environment constraints must remain documented as unverified.

## 7. Guardrail Precision
- Static analysis must explicitly identify the prohibited targets.
- Guardrails must not over-reject legitimate semantic naming or future extensions.
- Guardrails must be accompanied by both positive and negative fixtures.
- It must be verified that not only invalid inputs are rejected, but valid inputs are accepted.
- The precise scope of the inspection rules must be recorded in the closeout document.

## Executable Specification Synchronization
- Where a declarative schema and operational validator define the same artifact, responsibilities must be clearly bounded.
- Constraints expressible in schema must be recorded there.
- Adding validator constraints requires checking impacts on schema, docs, fixtures, and tests.
- Non-expressible constraints must be explicitly documented as operational.
- Schema-valid does not equal packet-acceptable (authoritative layers must be documented).
- Automated gates must check for synchronization between schema and validators.

## Self-Protecting Guardrails
- The accepted artifact inventory must protect itself (self-reference).
- The accepted artifact validator must also be in the inventory.
- Avoid structures where deleting a guardrail silently removes its check.
- Include fixed minimum requirements in the validator.
- When creating permanent governance artifacts, historical closeouts, security validators, contracts/schemas, or essential documents, they must be added to the accepted artifact inventory in the same Stride.
- Guardrails must have their own positive/negative tests.

## Decision-Gated Semantic Changes
- Agents must not guess owner decisions for semantic changes.
- Provide options, pros/cons, impacts, and a recommendation.
- Maintain semantic status quo unless decided otherwise.
- Separate blocked work from independent safe workstreams.
- Do not falsely claim unresolved items are completed.

## Verification Statement Consistency
- Do not combine positive behavioral claims with "Unverified".
- Cleanly separate: Automated, Environment-dependent, Manual visual, External audit, Not performed.
- Do not claim "all conditions verified" if some are unchecked.
- Closeouts must reflect actual execution facts and checked scopes only.
