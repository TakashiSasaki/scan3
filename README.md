# scan3

- `scan3`は`scan.moukaeritai.work`の第3世代再構築プロジェクトである。
- application versionは`3.0.0-alpha.1`。
- contract packagesは`0.1.0 draft`。
- `/app`は新アプリ領域。
- `/app/legacy`は旧アプリ復元領域。
- `/demo`は隔離されたデモ領域。
- `/dev/schema`および`contracts/`はschema workbench。
- 旧アプリのFirestore databaseは`photos.moukaeritai.work`。
- 新アプリのFirestore databaseは`scan.moukaeritai.work`。
- migration、dual-write、backfillを行わない。
- 現時点ではFirebase runtimeを実装していない。
- historical sourceはvalidated offline source packet経由でのみ受け取る。
- AI StudioはGitHubへアクセスできない。
- `scan3/main`はAI Studioによる一方向force-push対象である。
- GitHub側で`main`を直接編集しない。
