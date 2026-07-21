# Data Boundary

旧アプリの予定データモデルを以下に記録します。

## Firestore Collections
- `items`
- `users`
- `admins`

## Legacy Firestore Database
- `photos.moukaeritai.work`

## Current Application Firestore Database
- `scan.moukaeritai.work`

## 注意事項と禁止事項

historical source内に "photo-moukaeritai-work" という類似した識別子が記録されていても、Firestore databaseについてのrepository ownerの決定は `photos.moukaeritai.work` です。historical sourceの文字列を無条件に正しいdatabase IDとしてコピーしてはいけません。

旧アプリだけが `photos.moukaeritai.work` を使用し、新アプリだけが `scan.moukaeritai.work` を使用します。

以下の操作は禁止されています：
- cross-read
- cross-write
- fallback read
- dual-write
- migration
- backfill
- synchronization
- reconciliation
- compatibility adapter
