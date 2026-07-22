# Source packet distribution branch

This branch is used only to distribute source packet archives to environments that cannot use Git.

## Available packets

### Legacy data-model reference

Files:

- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7-validation-report.json`

This packet is a selective historical reference. It is not a complete restoration of the historical application.

### Legacy scanner historical evidence

Files:

- `source-packets/scan3-source-packet-legacy-scanner-evidence-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-scanner-evidence-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-scanner-evidence-a41267a7-validation-report.json`

This replacement packet stages exact historical scanner bytes under `reconstruction/historical/legacy-scanner/a41267a7/`, outside the active `src/` tree. It authorizes evidence preservation only. It does not authorize dependency installation, source adaptation, runtime import, route activation, Firebase connectivity, or weakening style validation.

### Superseded legacy scanner slice

The following earlier packet is retained only for provenance and must not be applied for staging:

- `source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7-validation-report.json`

Its `restore` destinations were under `src/` and conflict with the repository's style-residue guardrail. Use the legacy scanner historical evidence packet instead.

## Download the scanner evidence packet with curl

```bash
curl -fL -o scan3-source-packet-legacy-scanner-evidence-a41267a7.zip \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/refs/heads/chatgpt/source-packets/scan3-source-packet-legacy-scanner-evidence-a41267a7.zip

curl -fL -o scan3-source-packet-legacy-scanner-evidence-a41267a7.zip.sha256 \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/refs/heads/chatgpt/source-packets/scan3-source-packet-legacy-scanner-evidence-a41267a7.zip.sha256

sha256sum -c scan3-source-packet-legacy-scanner-evidence-a41267a7.zip.sha256
```

After extraction, run the authoritative repository-local validator from the scan3 workspace:

```bash
node scripts/validate-source-packet.cjs <packet-root>
```

Do not treat download success, the creation-time validation report, or SHA-256 verification alone as source-packet acceptance. Full repository-local validator success is required.
