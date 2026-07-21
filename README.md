# scan3

- scan3は第3世代の再構築プロジェクトである。
- application versionは`3.0.0-alpha.1`。
- contractは`0.1.0 draft`。
- `/app/legacy`は旧アプリ復元領域。
- `/app`は新アプリ領域。
- `/demo`は隔離されたデモ領域。
- `/dev/schema`と`contracts/`はschema workbench。
- 旧DBは`photos.moukaeritai.work`。
- 新DBは`scan.moukaeritai.work`。
- migration、dual-write、backfillは行わない。
- 現時点ではFirebase runtimeを実装していない。
- `main`はGoogle AI Studioの一方向force-push対象であり、GitHub側で直接編集しない。
