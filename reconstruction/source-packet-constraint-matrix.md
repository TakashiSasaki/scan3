# Source Packet Constraint Matrix

This file is generated from `source-packet-constraints.json`. Do not edit manually.

| ID | Description | Status | Authoritative Layer | Fixtures |
|----|-------------|--------|---------------------|----------|
| C-TOP-1 | Top-level is a closed object | implemented | schema | minimal, invalid-unknown-top-level-property |
| C-TOP-2 | Source descriptor is a closed object | implemented | schema | minimal |
| C-TOP-3 | Destination descriptor is a closed object | implemented | schema | minimal |
| C-TOP-4 | File entry is a closed object | implemented | schema | minimal, invalid-unknown-file-property |
| C-TOP-5 | Owner decision is a closed object | implemented | schema | minimal |
| C-PATH-1 | Safe relative paths forbid NUL, absolute, drive letters, UNC, and dot segments | implemented | schema | invalid-nul-path, invalid-dot-segment-posix, invalid-dot-segment-windows, invalid-path-traversal, invalid-windows-traversal, valid-dotted-filenames |
| C-PATH-2 | Safe relative paths forbid whitespace-only paths | implemented | schema | invalid-whitespace-path |
| C-PAYLOAD-1 | Payload root must exist and be a directory | implemented | operational | invalid-payload-root-not-directory |
| C-PAYLOAD-2 | Payload paths must not escape payload root via symlinks (realpath containment) | implemented | operational | invalid-embedded-traversal, symbolic-link-test |
| C-UNIQUE-1 | Exact-string duplicate sourcePath forbidden | implemented | operational | invalid-duplicate-source-path |
| C-UNIQUE-2 | Exact-string duplicate payloadPath forbidden | implemented | operational | invalid-duplicate-payload-path |
| C-UNIQUE-3 | Exact-string duplicate restore intendedDestination forbidden | implemented | operational | invalid-duplicate-destination |
| C-UNIQUE-4 | Exact-string duplicate owner decision id forbidden | implemented | operational | invalid-duplicate-owner-decision-id |
| C-UNIQUE-5 | Case-insensitive collision protection | deferred | deferred | - |
| C-DEST-1 | intendedDestination is required for all entries | implemented | schema | invalid-missing-intended-destination |
