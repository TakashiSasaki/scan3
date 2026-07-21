# Stride 2A.3 Closeout

## Versions
- Application Version: 3.0.0-alpha.1
- Contract Versions: 0.1.0 draft
- Source Packet Format Version: 1.0
- JSON Schema Dialect: Draft-07 (http://json-schema.org/draft-07/schema#)
- Ajv Version: 8.20.0

## Schema Constraints
- **Added Constraints**: `formatVersion`, structured strings, conditional paths based on disposition, integer constraints for size.
- **`$defs` equivalent**: Implemented via `definitions` (conforming to Draft-07) to reuse definitions for `nonBlankString`, `fullCommitSha`, `sha256`, `safeRelativePath`, `sourceDescriptor`, `destinationDescriptor`, `fileEntry`, and `ownerDecision`.
- **Safe Relative Path Constraint**: Validated via rigorous JSON Schema RegEx that prevents whitespace-only, NUL characters, absolute POSIX paths, absolute Windows paths, UNC paths, and `.` or `..` path segments.
- **Conditional Restore Constraint**: `intendedDestination` is strictly required when `disposition` is `restore`.
- **Safe Integer Constraint**: `sizeBytes` must be an integer between 0 and `9007199254740991`.

## Operational Constraints
Not all constraints can be resolved structurally. The following operational constraints are strictly tested after schema validation passes:
- **Filesystem Existence**: Payload file and root must exist and be accessible.
- **Symlink Protection**: Payload files and all ancestor directories up to the root must not be symlinks.
- **Realpath Containment**: The resolved path of the payload must remain strictly inside the payload root to prevent traversal attacks.
- **Size**: Actual filesystem size must exactly match `sizeBytes`.
- **Hash**: The calculated SHA-256 of the payload must exactly match the manifest `sha256`.
- **Cross-Entry Uniqueness**: `sourcePath`, `payloadPath`, `intendedDestination` (for restores), and `ownerDecisions[].id` must be unique across all respective arrays.

## Verification Results
- **Automated**: PASS (All `npm run verify:reconstruction` tests passed, including schema validations, operational validators, and artifact guardrails)
- **Environment-dependent**: PASS (Tested against POSIX path traversals and symbolic links on the current container runtime)
- **Manual visual**: NOT PERFORMED
- **External audit**: PENDING
- **Not performed**: Legacy functionality checks, source packet payload validation (due to no packet provided)

## Decision Requests
- **Active**: None
- **Resolved**: JSON Schema dialect preserved as Draft-07 and validation executed securely via Ajv.
- **Deferred**: Legacy reconstruction methods, data dual-write policies.

## Guardrails
- **Accepted Artifact Self-Protection**: Inventory now explicitly protects itself and its validator against tampering or silent deletions.
- **Schema-Validator Synchronization**: Validation pipeline guarantees that schema validations pass strictly before filesystem operations begin.
- **Decision Gate Protocol**: Established `policy/decision-gates.md` and explicit tracking for owner-level decisions to prevent automated drifting.
- **Upstream Policy Candidates**: Added policies for sync, self-protection, and statement consistency to `docs/reconstruction/upstream-policy-candidates.md`.

## Status
- Source packet: NOT SUPPLIED
- Legacy code: NOT IMPLEMENTED
- Firebase runtime: NOT IMPLEMENTED
