# Upstream Policy Candidates

This document records policy candidates identified during Stride 2A.1 Audit Remediation.

These are candidates for broader application across repositories. They are documented here because the current AI Studio workspace does not have access to directly update the `TakashiSasaki/agent-policy` repository. In the future, an external reviewer may port these candidates to `TakashiSasaki/agent-policy`.

The AI Studio agent itself has NOT updated the agent-policy repository.

## Policy Rules Added

1. **Accepted Artifact Preservation**: Explicitly protect existing artifacts such as READMEs, decision records, closeout documents, manifests, and test fixtures from implicit deletion. Past closeout documents must be preserved and not overwritten by subsequent Strides.
2. **Scope-Local UI Changes**: Confine route-specific UI changes to their appropriate surface areas, preventing them from leaking into the global layout (unless requested). Development-only UI must also be hidden in production.
3. **Verification Claim Integrity**: Ensure that closeout documents only claim properties to be "verified" if the validator script explicitly tests for those properties. For instance, catalog/router synchrony checks must be bidirectional.
4. **Implementation Status Accuracy**: Do not mislabel surface readiness states. Placeholders, planning areas, and un-restored legacy applications should be labeled truthfully across UI, catalog, and documentation.
5. **Security Validator Negative Coverage**: Develop negative fixtures for each significant rejection criteria. Path validations must check raw paths, normalized paths, and real paths, including symlink traversal checks. Expected failures must be confirmed explicitly in testing.

These guidelines are not unique to the `scan3` project and are broadly applicable to maintain integrity and prevent regression across other agentic developments.

### Validation Outcome Transparency
- PASS, FAIL, SKIP must be explicitly distinguished.
- SKIP must not be counted as PASS.
- A state with SKIP must not be described as "all tests passed".
- Record the exact number of PASS, FAIL, and SKIP cases along with their targets in closeout documents.
- Any items that cannot be verified due to environment constraints must remain documented as unverified.

### Guardrail Precision
- Static analysis must explicitly identify the prohibited targets.
- Guardrails must not over-reject legitimate semantic naming or future extensions.
- Guardrails must be accompanied by both positive and negative fixtures.
- It must be verified that not only invalid inputs are rejected, but valid inputs are accepted.
- The precise scope of the inspection rules must be recorded in the closeout document.
