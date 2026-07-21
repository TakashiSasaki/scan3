# Reconstruction

再構築作業の目的：
過去の `scan.moukaeritai.work` をそのまま継続するのではなく、履歴調査に基づいて必要な成果物を分離し、空のリポジトリから再構成する。

分離：
- `/app/legacy`: 旧アプリ
- `/app`: 新アプリ
- `/demo`: デモ
- `contracts/` および `/dev/schema`: schema workbench

各Strideの想定：
- Stride 1: 再構築基盤（現在の作業）

このStrideで実装していないもの：
- 実働するFirebase機能、Firestoreアクセス、Cloud Functions、データ移行、旧アプリ本体、新EFP runtime
