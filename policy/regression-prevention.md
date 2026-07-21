# Regression Prevention Policy

This policy document defines rules to prevent recurrences of issues identified during Stride audits. It acts as an addendum to the main project policy.

## 1. Accepted Artifact Preservation

- Do not implicitly delete existing artifacts unless explicitly instructed to do so.
- Do not implicitly delete READMEs, decision records, closeout documents, manifests, policy files, or test fixtures.
- Preserve past Stride closeout documents as historical records.
- Do not replace or overwrite past Stride closeout documents with documents from a new Stride.
- Before completing a task, verify changes against the baseline to ensure no unintended deletions occurred.
- Any intentionally deleted files must be listed in the completion report with reasons.

## 2. Scope-Local UI Changes

- Do not place route-specific UI elements in the global layout unless explicitly requested.
- Verify that route-specific UI does not leak into other surface areas.
- Ensure that development-only UI is hidden in production builds.

## 3. Verification Claim Integrity

- Do not claim a property is "verified" unless the validator actually checks it.
- Limit verification claims in closeout documents strictly to the executed commands and their actual scope.
- When claiming synchronization between the catalog and router, compare all entries bidirectionally.
- Do not use reasoning that contradicts framework specifications to justify verification logic.
- Record unverified items explicitly as unverified or "SKIP".

## 4. Implementation Status Accuracy

- Do not describe a placeholder surface as "active" or "completed".
- Do not describe a surface in the "planning" state as "implemented".
- Do not describe an "awaiting-source" area as "restored".
- Maintain consistency between UI descriptions, catalog status, READMEs, and closeout documents.

## 5. Security Validator Negative Coverage

- Prepare negative fixtures for each primary rejection condition at security boundaries.
- For path security, validate raw paths, normalized paths, and real paths separately.
- Check for symbolic links, path traversals, invalid types, and duplicate identifiers.
- Explicitly verify that expected failures result in test success.

## 6. Validation Outcome Transparency
- PASS, FAIL, SKIP must be explicitly distinguished.
- SKIP must not be counted as PASS.
- A state with SKIP must not be described as "all tests passed".
- Record the exact number of PASS, FAIL, and SKIP cases along with their targets in closeout documents.
- Any items that cannot be verified due to environment constraints must remain documented as unverified.

## 7. Guardrail Precision
- Static analysis must explicitly identify the prohibited targets.
- Guardrails must not over-reject legitimate semantic naming or future extensions.
- Guardrails must be accompanied by both positive and negative fixtures.
- It must be verified that not only invalid inputs are rejected, but valid inputs are accepted.
- The precise scope of the inspection rules must be recorded in the closeout document.

## Executable Specification Synchronization
- Where a declarative schema and operational validator define the same artifact, responsibilities must be clearly bounded.
- Constraints expressible in schema must be recorded there.
- Adding validator constraints requires checking impacts on schema, docs, fixtures, and tests.
- Non-expressible constraints must be explicitly documented as operational.
- Schema-valid does not equal packet-acceptable (authoritative layers must be documented).
- Automated gates must check for synchronization between schema and validators.

## Self-Protecting Guardrails
- The accepted artifact inventory must protect itself (self-reference).
- The accepted artifact validator must also be in the inventory.
- Avoid structures where deleting a guardrail silently removes its check.
- Include fixed minimum requirements in the validator.
- When creating permanent governance artifacts, historical closeouts, security validators, contracts/schemas, or essential documents, they must be added to the accepted artifact inventory in the same Stride.
- Guardrails must have their own positive/negative tests.

## Decision-Gated Semantic Changes
- Agents must not guess owner decisions for semantic changes.
- Provide options, pros/cons, impacts, and a recommendation.
- Maintain semantic status quo unless decided otherwise.
- Separate blocked work from independent safe workstreams.
- Do not falsely claim unresolved items are completed.

## Verification Statement Consistency
- Do not combine positive behavioral claims with "Unverified".
- Cleanly separate: Automated, Environment-dependent, Manual visual, External audit, Not performed.
- Do not claim "all conditions verified" if some are unchecked.
- Closeouts must reflect actual execution facts and checked scopes only.

### Test Catalog Single Source
- fixture名、期待結果、分類を複数のtest runnerへ重複定義しない。
- machine-readable expectation catalogをsingle source of truthとする。
- schema、operational、contract testは同じcatalogを参照する。
- catalog登録済みfixtureが未実行なら失敗する。
- filesystem上の未登録fixtureがあれば失敗する。

### Evidence-Backed Constraint Matrix
- constraint matrixのimplemented／verified主張には実装箇所とfixtureを対応させる。
- fixtureが先行layerで拒否される場合、後続constraintの証拠にしない。
- 実装されていないconstraintをimplementedと表現しない。
- schema、validator、fixture、matrixの不一致をautomated gateで検出する。
- deferred constraintを明示できるようにする。

### Guardrail Dependency Closure
- guardrail self-protectionはvalidator本体だけでなく、実行入口、設定、lockfile、test、fixtureを含める。
- npm scriptから到達する検証では"package.json"とlockfileも保護する。
- guardrailを実行不能にする単一artifact削除をinventoryで検出する。
- 新しいdependencyを追加した場合、guardrail dependency closureを確認する。

### Safe Child Process Invocation
- Node.jsから既知の実行ファイルを起動する場合は"execFileSync"または"spawnSync"を使用する。
- pathやargumentをshell command stringへ連結しない。
- test codeにも同じ規則を適用する。
- shellが本当に必要な場合は理由を文書化する。

### Decision Resolution Recording
- owner decisionを受け取ったStride内で"decisions.md"へ記録する。
- 対応するdecision requestをResolvedへ移動する。
- 会話履歴だけをdecision source of truthにしない。
- 未記録decisionに依存して次Strideへ進まない。

### Procedural Skill Extraction
- 繰り返し実施される多段階手順はagent skill化を検討する。
- 監査で同種の抜け漏れが複数回見つかった手順を優先する。
- skillはpolicy、script、schemaへの参照を持ち、mutableな事実を重複記載しない。
- skillはsource of truthではなく、実行手順の補助とする。
- skill自体をaccepted artifactとして保護する。
- skillの必須sectionをautomated validatorで検査する。

### Independent Verification Escalation
- agentの自己報告だけでは十分でないverificationには独立CIを使用する。
- CIはlocal verificationと同じauthoritative scriptを実行する。
- CI workflowはread-only、最小権限、secret不要を原則とする。
- local PASSとCI PASSを区別する。
- CI未実行または未確認をCI SUCCESSと表現しない。
- deployment workflowとverification workflowを分離する。

### Verification Pipeline Closure
- Ensure all relevant validators (schemas, contracts, tests, skills, controls) are connected to the central verification pipeline (e.g., verify:reconstruction).
- An unlinked validator provides no protective value and cannot be claimed as a control.

### Side-Effect-Free Validation
- Contract validation and evidence generation should be read-only during validation.
- Do not mutate the state, rewrite baseline files, or apply unapproved changes silently during the validation phase.
- Use in-memory comparisons or dry-runs for verifying artifact synchronization.

### Skill Activation and Enforcement
- Procedural skills MUST be referenced explicitly in `AGENTS.md` so that the agent context is aware of them.
- Ensure the skill structure (`SKILL.md`) follows the agreed schema.

### Transient Artifact Hygiene
- Avoid leaving temporary root scripts, intermediate outputs, or orphaned payload tests in the workspace after task completion.
- Temporary files must be cleaned up to prevent inventory drift and side-effects.

### Machine-Readable Control Validation
- Verify the integrity of control registries (fixture catalogs, constraint matrices, skill lists) through automated validators.
- Reject unknown fields, malformed formats, duplicate IDs, and unregistered target references.

### One-Way Export Baseline Guard
- 一方向export前にworkspace baselineのsentinelを検査する。
- baseline mismatch時はexportを停止する。
- 不足artifactを会話履歴から推測して再作成しない。
- current priorityとaccepted artifactをexport前に検証する。
