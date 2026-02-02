# 初期JS/RSC調査ログ

## bundle analyzer
- コマンド: `ANALYZE=true bun run build -- --webpack`
- 結果: `/.next/analyze/nodejs.html`
- 備考: ビルドはタイムアウトしたがレポートは生成された

## next/script 使用状況
- `next/script` の使用: なし（`rg -n "next/script" src`）

## 初期JSチャンク上位（Turbopack build）
```json
[
  { "file": "9cf72e8fc5bf0d35.js", "bytes": 571010 },
  { "file": "76e75b43519f0426.js", "bytes": 287279 },
  { "file": "dca5014dfe8629f1.js", "bytes": 287279 },
  { "file": "b3abaa0c5ce0fa80.js", "bytes": 236990 },
  { "file": "b7868254a5011e0a.js", "bytes": 223888 },
  { "file": "78a45837e3349954.js", "bytes": 118671 },
  { "file": "a6dad97d9634a72d.js", "bytes": 112594 },
  { "file": "7940dcf27c31d807.js", "bytes": 110977 },
  { "file": "52ff6319c900b15a.js", "bytes": 84986 },
  { "file": "30626ceb214c6efb.js", "bytes": 84161 },
  { "file": "96fb083ac152a6ed.js", "bytes": 84161 },
  { "file": "08659155960ad85a.js", "bytes": 60092 },
  { "file": "50958762072a5b33.js", "bytes": 60092 },
  { "file": "8c3f82779637e5a7.js", "bytes": 57699 },
  { "file": "12b3666b0534a907.js", "bytes": 52176 }
]
```

## RSC/HTML payload サイズ
- ログ: `/tmp/evame-rsc-size.json`

```json
{
  "measuredAt": "2026-02-02T05:43:33.579Z",
  "results": [
    {
      "url": "http://localhost:3000/ja",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1243994
    },
    {
      "url": "http://localhost:3000/ja?view=both",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1243818
    },
    {
      "url": "http://localhost:3000/ja?_rsc=1",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1242727
    },
    {
      "url": "http://localhost:3000/ja?view=both&_rsc=1",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1243730
    }
  ]
}
```

## ストリーミング順序（/ja?view=both）
- ログ: `/tmp/evame-rsc-stream.json`

```json
{
  "url": "http://localhost:3000/ja?view=both",
  "status": 200,
  "contentType": "text/html; charset=utf-8",
  "chunkCount": 254,
  "firstChunkMs": 533.45,
  "lastChunkMs": 3407.7,
  "totalBytes": 1241717
}
```
