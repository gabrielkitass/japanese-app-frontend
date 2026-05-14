# アイコン生成手順

PWAのホーム画面アイコン（192px / 512px PNG）を生成します。

## 手順

```bash
cd app/frontend/icons
npm install
node generate-icons.js
```

## 結果
- `icon-192.png` — Android Chrome のインストール要件（192×192px）
- `icon-512.png` — スプラッシュ画面用（512×512px）

## カスタマイズ
`icon-source.svg` を編集してから再実行すると新しいアイコンが生成されます。
