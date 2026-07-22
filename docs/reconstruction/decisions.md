# Decisions

- repository nameは`TakashiSasaki/scan3`
- product generationは3
- application versionは`3.0.0-alpha.1`から開始
- 最初のstable versionは将来の`3.0.0`
- Contractは`0.1.0 draft`から開始
- application versionとcontract versionは独立
- application generation 3は製品史を表す
- 過去runtimeとの互換性を表さない
- `scan3/main`はAI Studio専用の一方向force-push branch
- GitHub側でmainを直接編集しない
- accepted strideはtagまたはarchive branchで保存する
- 旧アプリと新アプリは別データベースを使用する。 (理由: 両者のデータモデルやライフサイクルが完全に異なるため)
- データmigrationを行わない。 (理由: 複雑な互換性維持による技術的負債を防ぐため)
- 旧アプリは復元後に凍結する。 (理由: メンテナンスリソースを新モデルに集中するため)
- 新モデルはschema-firstで進める。 (理由: runtimeの実装に先行して設計を確立するため)
- デモは `/demo` に集約する。 (理由: 本番環境から隔離された実験領域として扱うため)
- Google AI Studioの会話履歴をsource of truthにしない。 (理由: 一方向export環境であり、将来のセッションでコンテキストを失うのを防ぐため)

## SP-UNKNOWN-PROPERTIES-001
- JSON Schemaで表現可能なsource packet制約はschemaへ記録する。
- schema-validはpacket acceptanceの必要条件だが十分条件ではない。
- operational validatorはfilesystem、hash、size、cross-entry constraintを担当する。
- JSON Schema dialectは既存のDraft-07を維持する。
- "SP-UNKNOWN-PROPERTIES-001"ではOption Aを採用した。
- source packetのcore objectはclosed objectとする。
- repository-local handwritten agent skillを使用できる。
- agent-policy managed adoptionまでは、これらをagent-policy生成物と表現しない。
- 独立verificationにはread-only GitHub Actionsを使用できる。
- GitHub Actionsの実行結果はAI Studioの自己検証とは別に扱う。

## OUTCOME-FIRST-ACCEPTANCE-001
- 機能strideでは、作業の進捗と最終的な到達点を優先する。
- scope boundaryは計画、レビュー、報告の指針として維持する。
- scope deviationやtemporary artifactの存在だけを独立したacceptance blockerにしない。
- acceptanceは主要機能、既存機能の回帰、hard safety/data boundary、central verificationを中心に判断する。
- non-critical hygieneは可能なら同じStride、そうでなければ次Strideで処理する。
