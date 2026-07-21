# Restoration Contract

このドキュメントは旧アプリコードの復元における基本契約です。

## Source Authorityの優先順位

競合が発生した場合の優先順位は以下の通りです。下位の情報が上位と矛盾する場合、上位を採用してください。推論だけで欠損を補完してはいけません。不足はopen questionまたはblocked itemとして記録してください。

1. repository ownerが明示した現在の決定
2. scan3の `policy/` と `docs/reconstruction/decisions.md`
3. externally supplied source packet manifest
4. source packetに含まれるhistorical source files
5. historical documentation
6. agentによる推論
