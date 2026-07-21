# Stride 2A.6 Audit Addendum

## 1. Context and Purpose
This document serves as an addendum to Stride 2A.6, detailing critical corrective actions and capability enhancements related to the dynamic test registry, operational validation robustness (handling dangling symlinks, strict failure classification), and control registry bidirectional validation.

## 2. Corrective Actions & Enhancements

### 2.1 Dynamic Test Registry as Single Source of Truth
- Created `reconstruction/source-packet-dynamic-test-expectations.json` containing detailed definitions of all dynamic operational validator tests.
- Each entry strictly defines `name`, `expectedErrorCode`, `environmentDependent`, and `allowedSkipReasons`.
- Implemented bidirectional matching between this registry and the dynamic test setup functions defined inside `scripts/test-source-packet-validator.cjs`.

### 2.2 Symlink Validation Robustness & lstatSync Usage
- Refactored `scripts/validate-source-packet.cjs` to use `fs.lstatSync` instead of `fs.existsSync` to correctly detect symbolic links, including dangling ones.
- Ensured proper error classification for dangling root symlinks (`PAYLOAD_ROOT_SYMLINK`) and dangling payload file symlinks (`PAYLOAD_FILE_SYMLINK`).
- Ensured any unknown setup errors in dynamic tests result in an immediate `FAIL`, forbidding silent skips.

### 2.3 Strict Skip Semantics
- Enforced that only dynamic tests marked as `environmentDependent: true` in the registry can be skipped.
- If a skip occurs, the reason must be strictly validated against the allowed skip reasons defined in the dynamic registry.

### 2.4 Constraint Evidence Realignment
- Updated `reconstruction/source-packet-constraints.json` and regenerated `reconstruction/source-packet-constraint-matrix.md`:
  - Mapped realpath containment escape checks (`C-PAYLOAD-2`) to `"invalid-payload-file-symlink-outside"`.
  - Mapped payload file symlink checks (`C-PAYLOAD-NO-SYMLINK`) to `"invalid-payload-file-symlink-inside"` and `"invalid-payload-file-dangling-symlink"`.
  - Mapped root symlink checks (`C-PAYLOAD-ROOT-2`) to `"invalid-payload-root-symlink"` and `"invalid-payload-root-dangling-symlink"`.
  - Removed outdated references to the static `"symbolic-link-test"`.
- Aligned `C-REQ-OWNER` to point to `"/definitions/ownerDecision/required"` for correct required-property tracking.
- Aligned `C-TYPE-INT` to point to the full definition object `"/definitions/fileEntry/properties/sizeBytes"` to include safe integer limits (`minimum` and `maximum`).

### 2.5 Policy & Gate Synchronization
- Reordered the priority list in `policy/current-priority.md` to cleanly transition to Stride 2A.7 local verification and block unapproved downstream integrations before receiving a validated source packet.
- Updated `reconstruction/accepted-artifacts.json` to secure the provenance of all newly created test registries, closeouts, and addendum documents.
