# Route Map

旧アプリの既知のruntime領域を、復元予定として記録します。
このStrideではこれらのroute componentは作成しません。

## 旧routeからscan3への予定mapping:

- `old /` -> `/app/legacy`
- `old /search` -> `/app/legacy/search`
- `old /item/new` -> `/app/legacy/item/new`
- `old /item/:id` -> `/app/legacy/item/:id`
- `old /scanner` -> `/app/legacy/scanner`
- `old /overview` -> `/app/legacy/overview`
- `old /settings` -> `/app/legacy/settings`
- `old /admin` -> `/app/legacy/admin`

## Legacy Runtimeへ直接含めない領域:

旧repositoryに存在した次の領域は、後続作業で以下のsurfaceへ分類します。
具体的なdemo routeは、source packetと外部調査結果を受け取るまで確定しません。

- `old /demo` -> `/demo`
- `old /library-demo` -> `/demo`
- `old /test` -> `/test`
