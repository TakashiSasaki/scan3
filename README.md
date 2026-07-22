# Source packet distribution branch

This branch is used only to distribute source packet archives to environments that cannot use Git.

## Available packets

### Legacy data-model reference

Files:

- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7-validation-report.json`

This packet is a selective historical reference. It is not a complete restoration of the historical application.

### Legacy scanner slice

Files:

- `source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7-validation-report.json`

This packet is a bounded implementation slice for `/app/legacy/scanner`. It contains exact historical bytes for `Scanner.tsx` and the historical stylesheet, plus `package.json` as reference-only dependency context. It is not the complete legacy application or complete primary source set.

## Download the scanner slice with curl

```bash
curl -fL -o scan3-source-packet-legacy-scanner-slice-a41267a7.zip \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/refs/heads/chatgpt/source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7.zip

curl -fL -o scan3-source-packet-legacy-scanner-slice-a41267a7.zip.sha256 \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/refs/heads/chatgpt/source-packets/scan3-source-packet-legacy-scanner-slice-a41267a7.zip.sha256

sha256sum -c scan3-source-packet-legacy-scanner-slice-a41267a7.zip.sha256
```

After extraction, run the authoritative repository-local validator from the scan3 workspace:

```bash
node scripts/validate-source-packet.cjs <packet-root>
```

Do not treat download success, the creation-time validation report, or SHA-256 verification alone as source-packet acceptance. Full repository-local validator success is required.
