# Historical Evidence Receipts

## Schema and Operational Validation Boundaries
The verification of historical evidence is divided into two layers:
1. **Schema Validation**: Checks structural correctness, required fields, and basic string formats (like SHA-256 length).
2. **Operational Validation**: Handles repository-aware constraints, filesystem binding, sizes, SHA-256 hashing, path security, and accepted artifact inventory binding.

## Accepted Artifact Inventory Binding
Historical receipts and their stored files are strictly verified against the `reconstruction/accepted-artifacts.json` inventory. A receipt will FAIL validation if itself or any of its `storedPath` files are not present in the inventory.

## Stored File Verification
The operational validator actively reads the bytes on disk for each `storedPath` and verifies that the file size matches `sizeBytes` and the SHA-256 hash strictly matches the recorded `sha256` value in the receipt.

## Non-Runtime Filename Preservation
Historical script sources (such as `.ts`, `.tsx`, `.js`, etc.) must not be stored with active script extensions that could be inadvertently executed or processed by modern build tools, linters, or CI tools in this repository. 
To prevent this, we suffix script sources with extensions like `.source`.
The use of `.source` is strictly a filename modification to prevent execution; it does not indicate any modification or adaptation of the file content itself.

## Authenticity Proof Scope
The historical evidence receipt validator **does NOT** prove the source authenticity of the files from the upstream source repository, nor does it prove that the files are ready for runtime adaptation. 
ZIP integrity verification, source packet validation, and historical evidence receipt validation are separate evidence layers. The receipt merely tracks the file states inside this repository workspace after restoration.
