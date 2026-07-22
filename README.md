# Source packet distribution branch

This branch is used only to distribute validated-candidate source packet archives to environments that cannot use Git.

## Packet

- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7-validation-report.json`

The packet is a selective historical reference. It is not a complete restoration of the historical application.

## Download with curl

```bash
curl -fL -o scan3-source-packet-legacy-data-model-reference-a41267a7.zip \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/chatgpt/source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip

curl -fL -o scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256 \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/chatgpt/source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256

sha256sum -c scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256
```

After extraction, run the authoritative repository-local validator from the scan3 workspace:

```bash
node scripts/validate-source-packet.cjs <packet-root>
```

Do not treat download success or SHA-256 verification alone as source-packet acceptance. Full validator success is required.
