# Source packet distribution branch

This branch is used only to distribute source packet archives to environments that cannot use Git. It is not intended for merge into `main`.

## Available packets

### Legacy data-model reference

- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-data-model-reference-a41267a7-validation-report.json`

Selective historical reference only; not a complete restoration source set.

### Legacy scanner non-runtime evidence — current staging packet

- `source-packets/scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip`
- `source-packets/scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip.sha256`
- `source-packets/scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7-validation-report.json`

This packet preserves exact historical `Scanner.tsx` bytes at the non-runtime destination filename `Scanner.tsx.source`. It does not authorize dependency installation, `tsconfig.json` changes, active-source creation, adaptation, import, route activation, style-validator changes, or Firebase connectivity.

The ZIP distribution was repaired after the first published binary blob was found not to match its sidecar. The current ZIP blob is expected to have SHA-256 `bf9137dc65650474882ce04c7c55f6b42fd01fe28bc15f4b5e3c074c3a55273f`. Consumers must still verify the sidecar after every download.

Download:

```bash
curl -fL -o scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/refs/heads/chatgpt/source-packets/scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip

curl -fL -o scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip.sha256 \
  https://raw.githubusercontent.com/TakashiSasaki/scan3/refs/heads/chatgpt/source-packets/scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip.sha256

sha256sum -c scan3-source-packet-legacy-scanner-evidence-nonruntime-a41267a7.zip.sha256
```

After extraction, run the repository-local authoritative validator:

```bash
node scripts/validate-source-packet.cjs <packet-root>
```

### Superseded scanner staging packets

The following packets are retained for provenance but must not be used for staging:

- `scan3-source-packet-legacy-scanner-slice-a41267a7`: destination was under active `src/` and conflicted with style-residue validation.
- `scan3-source-packet-legacy-scanner-evidence-a41267a7`: destination retained the `.tsx` extension and entered TypeScript compilation, prompting an unauthorized `tsconfig.json` change.

Download success, a sidecar match, or the creation-time report alone is not packet acceptance. The current scan3 repository-local validator must pass before use.
