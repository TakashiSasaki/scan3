# Source Packet Constraint Matrix

This file is generated from `source-packet-constraints.json`. Do not edit manually.

| ID | Description | Status | Authoritative Layer | Schema Fixtures | Operational Tests |
|----|-------------|--------|---------------------|-----------------|-------------------|
| C-TOP-1 | Top-level is a closed object | implemented | schema | minimal, invalid-unknown-top-level-property | - |
| C-TOP-2 | Source descriptor is a closed object | implemented | schema | minimal, invalid-unknown-source-property | - |
| C-TOP-3 | Destination descriptor is a closed object | implemented | schema | minimal, invalid-unknown-destination-property | - |
| C-TOP-4 | File entry is a closed object | implemented | schema | minimal, invalid-unknown-file-property | - |
| C-TOP-5 | Owner decision is a closed object | implemented | schema | minimal, invalid-unknown-owner-decision-property | - |
| C-PATH-1 | Safe relative paths forbid NUL, absolute, drive letters, UNC, and dot segments | implemented | schema | invalid-nul-path, invalid-dot-segment-posix, invalid-dot-segment-windows, invalid-path-traversal, invalid-windows-traversal, invalid-embedded-traversal, valid-dotted-filenames | - |
| C-PATH-2 | Safe relative paths forbid whitespace-only paths | implemented | schema | invalid-whitespace-path | - |
| C-PAYLOAD-ROOT-1 | Payload root must exist | implemented | operational | - | invalid-payload-root-missing |
| C-PAYLOAD-ROOT-2 | Payload root must not be a symbolic link | implemented | operational | - | invalid-payload-root-symlink, invalid-payload-root-dangling-symlink |
| C-PAYLOAD-ROOT-3 | Payload root must be a directory | implemented | operational | - | invalid-payload-root-not-directory |
| C-PAYLOAD-FILE-1 | Payload file must exist | implemented | operational | - | invalid-payload-file-missing |
| C-PAYLOAD-2 | Payload paths must not escape payload root via symlinks (realpath containment) | implemented | operational | - | invalid-payload-file-symlink-outside |
| C-PAYLOAD-ANCESTOR-SYMLINK | Payload path must not contain symbolic link | implemented | operational | - | invalid-payload-ancestor-symlink |
| C-UNIQUE-1 | Exact-string duplicate sourcePath forbidden | implemented | operational | - | invalid-duplicate-source-path |
| C-UNIQUE-2 | Exact-string duplicate payloadPath forbidden | implemented | operational | - | invalid-duplicate-payload-path |
| C-UNIQUE-3 | Exact-string duplicate restore intendedDestination forbidden | implemented | operational | - | invalid-duplicate-destination |
| C-UNIQUE-4 | Exact-string duplicate owner decision id forbidden | implemented | operational | - | invalid-duplicate-owner-decision-id |
| C-UNIQUE-5 | Case-insensitive collision protection | deferred | deferred | - | - |
| C-DEST-1 | intendedDestination is required for all entries | implemented | schema | invalid-missing-intended-destination | - |
| C-FORMAT | formatVersion must be 1.0 | implemented | schema | minimal, invalid-format-version | - |
| C-REQ-1 | Required fields at top level | implemented | schema | minimal, invalid-missing-top-level-field, invalid-missing-format-version, invalid-missing-purpose, invalid-missing-source, invalid-missing-destination, invalid-missing-files, invalid-missing-owner-decisions, invalid-file-entry-type, invalid-owner-decision-array | - |
| C-TYPE-STR | Non-blank string type | implemented | schema | minimal, invalid-packet-id-type, invalid-purpose-type, invalid-source-repository-type, invalid-empty-string, invalid-blank-string, invalid-notes-type | - |
| C-TYPE-SHA1 | Commit SHA type | implemented | schema | minimal, invalid-commit-sha | - |
| C-TYPE-SHA256 | SHA-256 type | implemented | schema | minimal, invalid-sha256-format | - |
| C-TYPE-INT | Safe integer for sizeBytes | implemented | schema | minimal, invalid-noninteger-size, invalid-negative-size, invalid-large-size | - |
| C-ENUM-DISP | Disposition enum | implemented | schema | minimal, invalid-disposition | - |
| C-REQ-OWNER | Owner decision missing value | implemented | schema | minimal, invalid-missing-owner-value | - |
| C-PAYLOAD-SIZE | Actual file size match | implemented | operational | - | invalid-size, invalid-payload-size-mismatch |
| C-PAYLOAD-HASH | Actual file hash match | implemented | operational | - | invalid-hash, invalid-payload-hash-mismatch |
| C-PAYLOAD-REGULAR | Payload must be a regular file | implemented | operational | - | invalid-payload-not-regular-file |
| C-PAYLOAD-NO-SYMLINK | Payload must not be a symbolic link | implemented | operational | - | invalid-payload-file-symlink-inside, invalid-payload-file-dangling-symlink |
