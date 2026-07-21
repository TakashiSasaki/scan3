# Independent Continuous Integration

This repository uses GitHub Actions for independent continuous integration.

## Workflow: Verify Reconstruction

- **File**: `.github/workflows/verify-reconstruction.yml`
- **Purpose**: Runs automated verification independent of AI Studio environment.
- **Triggers**: `push` on `main`, `pull_request`, `workflow_dispatch`.
- **Permissions**: `contents: read` only. No write access, no deployments.
- **Environment**: Node.js 22.

The CI workflow executes `npm run verify:reconstruction` to ensure all guardrails and constraints are maintained.
