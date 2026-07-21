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
