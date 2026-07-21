# Repository Roles

## Historical source repository
`TakashiSasaki/scan.moukaeritai.work`

**役割:**
- 過去のコード、設計、デモ、schema、migration履歴を調査するsource。
- read-onlyのhistorical referenceとして扱う。
- AI Studioは直接アクセスできない。
- source repositoryの内容は、外部調査者がpacketへ抽出して初めてAI Studioで利用できる。

## Reconstruction destination repository
`TakashiSasaki/scan3`

**役割:**
- 第3世代アプリケーションの再構築先。
- AI Studioの現在のワークスペース。
- "main"はAI Studioによる一方向force-push対象。
- GitHub側で直接編集した変更は、次回force pushで失われる可能性がある。

## External reviewer / transfer bridge

**役割:**
- 両repositoryをGitHub上で調査する。
- source commitとdestination baselineを比較する。
- 必要なファイル本体を抽出する。
- SHA-256を計算する。
- source packet manifestを作る。
- AI Studioの出力後にscan3を再確認する。

**注意:**
GitHub URLやcommit SHAはprovenanceであり、source bytesの代わりにはならない。
