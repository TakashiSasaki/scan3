# Agent Instructions

This repository contains the reconstructed foundation for `scan.moukaeritai.work`.
現在のrepositoryは `scan3` です。

When working on this repository, strictly adhere to the policies defined in:
- `policy/project.md`
- `policy/current-priority.md`
- `policy/regression-prevention.md`
- `policy/decision-gates.md`

Do NOT implement any Firebase connectivity, data migrations, or new runtimes without explicit approval.
Follow the boundaries and limitations described in the reconstruction documents (`docs/reconstruction/`).

Important Constraints:
- owner decisionが必要なsemantic changeを推測で実行しない。
- 選択肢と推奨案を提示して判断を求める。
- schemaとvalidatorを同期する。
- accepted artifact inventoryを更新する。
- 過去closeoutを削除または書き換えない。
- source packetがない状態でlegacy codeを実装しない。
- GitHub URLやcommit SHAだけからsource codeを推測しない
- external sourceはvalidated source packetとして受け取る
- source packetに含まれないhistorical fileを実装しない
- provenanceとowner decisionの優先順位を守る

*(Note: This is a temporary handwritten instruction file, not an agent-policy generated file.)*
