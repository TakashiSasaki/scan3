# Source Packet Documentation

## source packetの目的
AI Studioワークスペースは外部ネットワークやGitHubに直接アクセスできない環境として運用されます。
そのため、過去のコード（historical source）をワークスペースに安全かつ検証可能な形で導入するために offline source packet が使用されます。

## directory構造
packetは次のような構造を持ちます。
```
<packet-root>/
  manifest.json
  payload/
    file1.txt
    file2.txt
```

## `manifest.json`と`payload/`の役割
- `manifest.json`: source packetのメタデータ、ファイルの配置先、ハッシュ値、およびファイルのサイズなどを定義します。
- `payload/`: 実際のファイルデータが含まれるディレクトリです。

## validatorの実行方法
以下のコマンドでバリデーションが可能です。

```bash
npm run sources:validate:example
node scripts/validate-source-packet.cjs <packet-root>
```

## 注意事項
- AI StudioはGitHubへアクセスしません。
- commit SHAはprovenance（来歴）を示す識別子であり、source bytesを直接ダウンロードするためのものではありません。
- packetを手動で改変した場合、ハッシュ検証が失敗し拒否されます。
- validated packetだけを後続のrestorationで使用します。
- example packetは形式確認用であり、実際のhistorical sourceを含んでいません。
