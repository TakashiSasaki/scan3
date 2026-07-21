# Source Packet Constraint Matrix

| Constraint ID | Constraint Description | JSON Schema | Schema Keyword / Definition | Operational Validator | Fixture | Authoritative Layer | Notes |
|---|---|---|---|---|---|---|---|
| C-TOP-1 | Top-level is an object | Yes | `type: "object"` | No | `minimal` | schema | |
| C-FMT-1 | `formatVersion` is strictly "1.0" | Yes | `properties.formatVersion` (`const`) | No | `minimal` | schema | |
| C-STR-1 | `packetId`, `purpose`, `source.repository`, `ownerDecisions[].id`, `ownerDecisions[].reason` are non-blank strings | Yes | `$ref: "#/definitions/nonBlankString"` | No | `invalid-packet-id-type`, `invalid-purpose-type`, `invalid-missing-owner-value` | schema | |
| C-SHA-1 | Commit SHAs are 40 lowercase hex chars | Yes | `$ref: "#/definitions/fullCommitSha"` | No | `invalid-source-repository-type` (implied test) | schema | |
| C-DST-1 | Destination repository is "TakashiSasaki/scan3" | Yes | `properties.destinationDescriptor` (`const`) | No | `minimal` | schema | |
| C-FILE-1 | `files` is an array of objects | Yes | `type: "array"`, `items.type: "object"` | No | `invalid-file-entry-type` | schema | |
| C-SHA-2 | `sha256` is 64 lowercase hex chars | Yes | `$ref: "#/definitions/sha256"` | No | `minimal` | schema | |
| C-SIZE-1 | `sizeBytes` is a non-negative safe integer | Yes | `type: "integer"`, `minimum: 0`, `maximum: 9007199254740991` | No | `invalid-noninteger-size` | schema | |
| C-DISP-1 | `disposition` must be restore, reference, or exclude | Yes | `enum` | No | `minimal` | schema | |
| C-PATH-1 | Safe relative paths (no NUL, spaces, abs, . or .. segments) | Yes | `$ref: "#/definitions/safeRelativePath"` | Yes | `invalid-nul-path`, `invalid-dot-segment-posix`, `invalid-dot-segment-windows` | both | Defensive assertion in validator for security boundary. |
| C-COND-1 | If `disposition` is restore, `intendedDestination` is required string | Yes | `if`/`then` conditional | No | `minimal` | schema | |
| C-OWN-1 | `ownerDecisions` is an array of objects with value | Yes | `$ref: "#/definitions/ownerDecision"` | No | `invalid-owner-decision-array` | schema | |
| C-OBJ-1 | Prevent arrays/primitives where plain objects are expected | Yes | `type: "object"` | No | `invalid-file-entry-type` | schema | |
| C-FILE-2 | Payload file exists in filesystem | No | - | Yes | operational only | operational | |
| C-FILE-3 | Payload root exists and is a directory | No | - | Yes | operational only | operational | |
| C-FILE-4 | Payload file is a regular file (no symlinks) | No | - | Yes | operational only | operational | |
| C-FILE-5 | Payload path contains no symlinks in ancestors | No | - | Yes | operational only | operational | |
| C-FILE-6 | Payload realpath is contained in payload root | No | - | Yes | invalid-windows-traversal, invalid-path-traversal | operational | |
| C-FILE-7 | Payload file size matches `sizeBytes` | No | - | Yes | invalid-size | operational | |
| C-FILE-8 | Payload SHA-256 matches manifest | No | - | Yes | invalid-hash | operational | |
| C-UNIQ-1 | `sourcePath` is unique across entries | No | - | Yes | operational only | operational | JSON Schema uniqueItems doesn't guarantee property uniqueness. |
| C-UNIQ-2 | `payloadPath` is unique across entries | No | - | Yes | invalid-duplicate-destination | operational | |
| C-UNIQ-3 | `intendedDestination` is unique for restore entries | No | - | Yes | operational only | operational | |
| C-UNIQ-4 | `ownerDecisions[].id` is unique | No | - | Yes | operational only | operational | |
| C-UNIQ-5 | Filesystem case sensitivity collisions | No | - | Yes | operational only | operational | |
