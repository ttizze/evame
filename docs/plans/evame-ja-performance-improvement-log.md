# Evame /ja パフォーマンス計測ログ

## ローカル本番相当 (build + start)
- 実行日: 2026-02-02
- 実行環境: `bun run build` → `bun run start`
- サーバーPID: 99081
- サーバーログ: `/tmp/evame-start.log`
- URL: `http://localhost:3000/ja`（計測上は `?view=both` が付与）

### Desktop (Puppeteer headless)
- 計測コマンド: `performance.js --url http://localhost:3000/ja --resources true --trace /tmp/evame-local-ja-trace.json`
- 結果（要約）
  - TTFB: 114.5ms
  - FCP: 1788ms
  - LCP: null
  - requests: 53
- トレース: `/tmp/evame-local-ja-trace.json`

```json
{
  "success": true,
  "url": "http://localhost:3000/ja?view=both",
  "metrics": {
    "Timestamp": 382241.249949,
    "Documents": 11,
    "Frames": 4,
    "JSEventListeners": 625,
    "Nodes": 11031,
    "LayoutCount": 170,
    "RecalcStyleCount": 192,
    "LayoutDuration": 0.31975,
    "RecalcStyleDuration": 0.236457,
    "ScriptDuration": 0.607028,
    "TaskDuration": 3.052196,
    "JSHeapUsedSize": 15352088,
    "JSHeapTotalSize": 21495808,
    "JSHeapUsedSizeMB": "14.64",
    "JSHeapTotalSizeMB": "20.50"
  },
  "vitals": {
    "LCP": null,
    "FID": null,
    "CLS": 0,
    "FCP": 1788,
    "TTFB": 114.5
  }
}
```

### Mobile (iPhone UA/viewport)
- 計測コマンド: `/tmp/measure-evame-mobile-local.js`
- 結果（要約）
  - TTFB: 134.4ms
  - FCP: 1996ms
  - LCP: null

```json
{
  "success": true,
  "url": "http://localhost:3000/ja?view=both",
  "metrics": {
    "Timestamp": 382289.2141,
    "Documents": 12,
    "Frames": 4,
    "JSEventListeners": 608,
    "Nodes": 10995,
    "LayoutCount": 114,
    "RecalcStyleCount": 159,
    "LayoutDuration": 0.166274,
    "RecalcStyleDuration": 0.212772,
    "ScriptDuration": 0.674341,
    "TaskDuration": 2.108071,
    "JSHeapUsedSize": 13450608,
    "JSHeapTotalSize": 21233664,
    "JSHeapUsedSizeMB": "12.83",
    "JSHeapTotalSizeMB": "20.25"
  },
  "vitals": {
    "LCP": null,
    "FID": null,
    "CLS": 0,
    "FCP": 1996,
    "TTFB": 134.39999997615814
  }
}
```

## ローカル本番相当（/search prefetch 無効化後）
- 実行日: 2026-02-02
- 変更点: `src/app/[locale]/(common-layout)/_components/header/user-slot.client.tsx` の `/search` Link を `prefetch={false}`
- サーバーPID: 6545
- サーバーログ: `/tmp/evame-start-after-prefetch-off.log`
- URL: `http://localhost:3000/ja`（計測上は `?view=both` が付与）

### Desktop (Puppeteer headless)
- 計測コマンド: `performance.js --url http://localhost:3000/ja --resources true --trace /tmp/evame-local-ja-trace-prefetch-off.json`
- 結果（要約）
  - TTFB: 175.4ms
  - FCP: 2468ms
  - LCP: null
  - requests: 48
- トレース: `/tmp/evame-local-ja-trace-prefetch-off.json`

```json
{
  "success": true,
  "url": "http://localhost:3000/ja?view=both",
  "metrics": {
    "Timestamp": 383363.147112,
    "Documents": 6,
    "Frames": 4,
    "JSEventListeners": 563,
    "Nodes": 7381,
    "LayoutCount": 257,
    "RecalcStyleCount": 282,
    "LayoutDuration": 0.329313,
    "RecalcStyleDuration": 0.446754,
    "ScriptDuration": 0.802081,
    "TaskDuration": 5.093898,
    "JSHeapUsedSize": 10788896,
    "JSHeapTotalSize": 21757952,
    "JSHeapUsedSizeMB": "10.29",
    "JSHeapTotalSizeMB": "20.75"
  },
  "vitals": {
    "LCP": null,
    "FID": null,
    "CLS": 0,
    "FCP": 2468,
    "TTFB": 175.4000000357628
  }
}
```

### Mobile (iPhone UA/viewport)
- 計測コマンド: `/tmp/measure-evame-mobile-local.js`
- 結果（要約）
  - TTFB: 176ms
  - FCP: 2656ms
  - LCP: null

```json
{
  "success": true,
  "url": "http://localhost:3000/ja?view=both",
  "metrics": {
    "Timestamp": 383393.615277,
    "Documents": 12,
    "Frames": 4,
    "JSEventListeners": 598,
    "Nodes": 10991,
    "LayoutCount": 135,
    "RecalcStyleCount": 184,
    "LayoutDuration": 0.182343,
    "RecalcStyleDuration": 0.271409,
    "ScriptDuration": 0.819845,
    "TaskDuration": 2.795888,
    "JSHeapUsedSize": 14278784,
    "JSHeapTotalSize": 20709376,
    "JSHeapUsedSizeMB": "13.62",
    "JSHeapTotalSizeMB": "19.75"
  },
  "vitals": {
    "LCP": null,
    "FID": null,
    "CLS": 0,
    "FCP": 2656,
    "TTFB": 176
  }
}
```

### Desktop 5-run 平均（prefetch無効化）
- 計測コマンド: `/tmp/run-5-desktop.js`
- 平均
  - FCP: 3171.2ms
  - TTFB: 185.26ms

```json
{
  "runs": 5,
  "average": {
    "FCP": 3171.2,
    "TTFB": 185.26000000238417
  },
  "results": [
    { "run": 1, "fcp": 3044, "ttfb": 194.5, "url": "http://localhost:3000/ja?view=both" },
    { "run": 2, "fcp": 3536, "ttfb": 259.69999998807907, "url": "http://localhost:3000/ja?view=both" },
    { "run": 3, "fcp": 2996, "ttfb": 132.89999997615814, "url": "http://localhost:3000/ja?view=both" },
    { "run": 4, "fcp": 3404, "ttfb": 156.80000001192093, "url": "http://localhost:3000/ja?view=both" },
    { "run": 5, "fcp": 2876, "ttfb": 182.4000000357628, "url": "http://localhost:3000/ja?view=both" }
  ]
}
```

### Mobile 5-run 平均（prefetch無効化）
- 計測コマンド: `/tmp/run-5-mobile-local.js`
- 平均
  - FCP: 2840ms
  - TTFB: 86.62ms

```json
{
  "runs": 5,
  "average": {
    "FCP": 2840,
    "TTFB": 86.6200000166893
  },
  "results": [
    { "run": 1, "fcp": 3800, "ttfb": 141.69999998807907, "url": "http://localhost:3000/ja?view=both" },
    { "run": 2, "fcp": 2820, "ttfb": 129.60000002384186, "url": "http://localhost:3000/ja?view=both" },
    { "run": 3, "fcp": 2620, "ttfb": 58.700000047683716, "url": "http://localhost:3000/ja?view=both" },
    { "run": 4, "fcp": 2052, "ttfb": 51.60000002384186, "url": "http://localhost:3000/ja?view=both" },
    { "run": 5, "fcp": 2908, "ttfb": 51.5, "url": "http://localhost:3000/ja?view=both" }
  ]
}
```

## ローカル本番相当（baseline: prefetch=on, session=on）
- 実行日: 2026-02-02
- 環境変数: なし
- サーバーPID: 17672
- サーバーログ: `/tmp/evame-start-baseline.log`
- URL: `http://localhost:3000/ja`（計測上は `?view=both` が付与）

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3262.4,
    "TTFB": 165.42000000476838
  },
  "results": [
    {
      "run": 1,
      "fcp": 3148,
      "ttfb": 285,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 2800,
      "ttfb": 121.30000001192093,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 3440,
      "ttfb": 143.30000001192093,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 3612,
      "ttfb": 155.5,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 3312,
      "ttfb": 122,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 2804.8,
    "TTFB": 140.09999998807908
  },
  "results": [
    {
      "run": 1,
      "fcp": 2964,
      "ttfb": 193.30000001192093,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 2620,
      "ttfb": 141.0999999642372,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 3388,
      "ttfb": 145.89999997615814,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 2452,
      "ttfb": 87.5,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 2600,
      "ttfb": 132.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

## ローカル本番相当（prefetch=off, session=on）
- 実行日: 2026-02-02
- 環境変数: NEXT_PUBLIC_DISABLE_SEARCH_PREFETCH=true
- サーバーPID: 20641
- サーバーログ: `/tmp/evame-start-prefetch-off.log`
- URL: `http://localhost:3000/ja`（計測上は `?view=both` が付与）

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3213.6,
    "TTFB": 153.62000000476837
  },
  "results": [
    {
      "run": 1,
      "fcp": 3132,
      "ttfb": 237.80000001192093,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 3780,
      "ttfb": 154.5999999642372,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 2992,
      "ttfb": 130.4000000357628,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 2872,
      "ttfb": 131.60000002384186,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 3292,
      "ttfb": 113.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3248,
    "TTFB": 144.87999999523163
  },
  "results": [
    {
      "run": 1,
      "fcp": 2212,
      "ttfb": 150.70000004768372,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 3184,
      "ttfb": 147.5999999642372,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 2756,
      "ttfb": 156.5,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 5216,
      "ttfb": 210,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 2872,
      "ttfb": 59.59999996423721,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

## ローカル本番相当（prefetch=on, session=off）
- 実行日: 2026-02-02
- 環境変数: NEXT_PUBLIC_DISABLE_SESSION_FETCH=true
- サーバーPID: 23604
- サーバーログ: `/tmp/evame-start-session-off.log`
- URL: `http://localhost:3000/ja`（計測上は `?view=both` が付与）

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3372,
    "TTFB": 184.87999999523163
  },
  "results": [
    {
      "run": 1,
      "fcp": 3444,
      "ttfb": 213.70000004768372,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 3208,
      "ttfb": 244.89999997615814,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 3336,
      "ttfb": 140.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 3820,
      "ttfb": 169.39999997615814,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 3052,
      "ttfb": 155.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3326.4,
    "TTFB": 101.21999999284745
  },
  "results": [
    {
      "run": 1,
      "fcp": 2952,
      "ttfb": 133.89999997615814,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 3208,
      "ttfb": 61.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 3216,
      "ttfb": 83.19999998807907,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 3128,
      "ttfb": 122.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 4128,
      "ttfb": 104.60000002384186,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

## ローカル本番相当（prefetch=off, session=off）
- 実行日: 2026-02-02
- 環境変数: NEXT_PUBLIC_DISABLE_SESSION_FETCH=true, NEXT_PUBLIC_DISABLE_SEARCH_PREFETCH=true
- サーバーPID: 26488
- サーバーログ: `/tmp/evame-start-both-off.log`
- URL: `http://localhost:3000/ja`（計測上は `?view=both` が付与）

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3313.6,
    "TTFB": 181.5399999976158
  },
  "results": [
    {
      "run": 1,
      "fcp": 3124,
      "ttfb": 247.4000000357628,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 2916,
      "ttfb": 185.29999995231628,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 3656,
      "ttfb": 150,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 3848,
      "ttfb": 185.30000001192093,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 3024,
      "ttfb": 139.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 2572,
    "TTFB": 116.52000000476838
  },
  "results": [
    {
      "run": 1,
      "fcp": 2368,
      "ttfb": 46.39999997615814,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 2,
      "fcp": 2816,
      "ttfb": 188,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 3,
      "fcp": 2640,
      "ttfb": 96.69999998807907,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 4,
      "fcp": 2396,
      "ttfb": 132.20000004768372,
      "url": "http://localhost:3000/ja?view=both"
    },
    {
      "run": 5,
      "fcp": 2640,
      "ttfb": 119.30000001192093,
      "url": "http://localhost:3000/ja?view=both"
    }
  ]
}

## バンドル解析
- 実行日: 2026-02-02
- コマンド: `ANALYZE=true bun run build`（Turbopack）
- 結果: Turbopack では `@next/bundle-analyzer` が動作せずレポート生成なし

- コマンド: `ANALYZE=true bun run build -- --webpack`
- 結果: `/.next/analyze/nodejs.html` を生成（ビルドはタイムアウト）
- レポート: `/home/tizze/program/chromeExtension/eveeve/.worktrees/plan-perf-improvement/.next/analyze/nodejs.html`

## ローカル本番相当（view query sync=off, prefetch=on, session=on）
- 実行日: 2026-02-02
- 環境変数: NEXT_PUBLIC_DISABLE_VIEW_QUERY_SYNC=true
- サーバーPID: 38249
- サーバーログ: `/tmp/evame-start-view-query-off.log`
- URL: `http://localhost:3000/ja`

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3088,
    "TTFB": 139.3200000166893
  },
  "results": [
    {
      "run": 1,
      "fcp": 3400,
      "ttfb": 236.60000002384186,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 2,
      "fcp": 3604,
      "ttfb": 98.90000003576279,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 3,
      "fcp": 2364,
      "ttfb": 94,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 4,
      "fcp": 2972,
      "ttfb": 151.80000001192093,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 5,
      "fcp": 3100,
      "ttfb": 115.30000001192093,
      "url": "http://localhost:3000/ja"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 2764.8,
    "TTFB": 121.29999998807907
  },
  "results": [
    {
      "run": 1,
      "fcp": 3016,
      "ttfb": 117.69999998807907,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 2,
      "fcp": 3028,
      "ttfb": 157.19999998807907,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 3,
      "fcp": 2920,
      "ttfb": 140.5,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 4,
      "fcp": 2780,
      "ttfb": 74.59999996423721,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 5,
      "fcp": 2080,
      "ttfb": 116.5,
      "url": "http://localhost:3000/ja"
    }
  ]
}

## ローカル本番相当（final default: view query auto-sync off, prefetch=on, session=on）
- 実行日: 2026-02-02
- 変更点: view クエリの自動同期を廃止
- サーバーPID: 42583
- サーバーログ: `/tmp/evame-start-final.log`
- URL: `http://localhost:3000/ja`

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 3153.6,
    "TTFB": 238.4399999976158
  },
  "results": [
    {
      "run": 1,
      "fcp": 3208,
      "ttfb": 400.60000002384186,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 2,
      "fcp": 3000,
      "ttfb": 166.9000000357628,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 3,
      "fcp": 3652,
      "ttfb": 266.39999997615814,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 4,
      "fcp": 3196,
      "ttfb": 165.5999999642372,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 5,
      "fcp": 2712,
      "ttfb": 192.69999998807907,
      "url": "http://localhost:3000/ja"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 2664,
    "TTFB": 127.34000000953674
  },
  "results": [
    {
      "run": 1,
      "fcp": 2984,
      "ttfb": 268.89999997615814,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 2,
      "fcp": 2868,
      "ttfb": 115.60000002384186,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 3,
      "fcp": 1972,
      "ttfb": 56.60000002384186,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 4,
      "fcp": 3092,
      "ttfb": 77.80000001192093,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 5,
      "fcp": 2404,
      "ttfb": 117.80000001192093,
      "url": "http://localhost:3000/ja"
    }
  ]
}

## RSC/HTML payload 計測（local）
- 実行日: 2026-02-02
- サーバーPID: 47620
- サーバーログ: `/tmp/evame-start-rsc.log`

### HTML/疑似RSC サイズ
```json
{
  "measuredAt": "2026-02-02T04:12:16.600Z",
  "results": [
    {
      "url": "http://localhost:3000/ja",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1241905
    },
    {
      "url": "http://localhost:3000/ja?view=both",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1244614
    },
    {
      "url": "http://localhost:3000/ja?_rsc=1",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1244783
    },
    {
      "url": "http://localhost:3000/ja?view=both&_rsc=1",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "contentLengthHeader": null,
      "bodyBytes": 1241685
    }
  ]
}
```

### _rsc fetch 集計（performance.js）
```json
{
  "count": 10,
  "totalBytes": 11120,
  "top": [
    {
      "name": "http://localhost:3000/ja/search?_rsc=1bfej",
      "size": 3553,
      "duration": 723.1000000238419
    },
    {
      "name": "http://localhost:3000/ja/search?_rsc=tqohb",
      "size": 1223,
      "duration": 365.39999997615814
    },
    {
      "name": "http://localhost:3000/ja?_rsc=7uv54",
      "size": 1209,
      "duration": 169.5
    },
    {
      "name": "http://localhost:3000/ja/search?_rsc=7uv54",
      "size": 1059,
      "duration": 343.4000000357628
    },
    {
      "name": "http://localhost:3000/ja/search?_rsc=mubk0",
      "size": 981,
      "duration": 729.8000000119209
    }
  ]
}
```

## 初期JSチャンク上位（local）
```json
[
  { "file": "5091f43ee1cbb108.js", "bytes": 571009 },
  { "file": "07ca32c82424ada5.js", "bytes": 287279 },
  { "file": "4d0e45470616287a.js", "bytes": 287279 },
  { "file": "178ee8cb671c635a.js", "bytes": 236983 },
  { "file": "b7868254a5011e0a.js", "bytes": 223888 },
  { "file": "c9eabf014519baaa.js", "bytes": 118668 },
  { "file": "a6dad97d9634a72d.js", "bytes": 112594 },
  { "file": "74d0ff6007a86174.js", "bytes": 110975 },
  { "file": "52ff6319c900b15a.js", "bytes": 84986 },
  { "file": "624a9d87e3082b43.js", "bytes": 84161 },
  { "file": "cf878b8e04c70977.js", "bytes": 84161 },
  { "file": "5fcb743dbae73d46.js", "bytes": 60093 },
  { "file": "6aa13119779165df.js", "bytes": 60093 },
  { "file": "8c3f82779637e5a7.js", "bytes": 57699 },
  { "file": "d7dcaff24639f037.js", "bytes": 52167 }
]
```

## ローカル本番相当（Suspense streaming: About + lists）
- 実行日: 2026-02-02
- 変更点: `/[locale]` で About/List を Suspense で分割ストリーミング
- サーバーPID: 50437
- サーバーログ: `/tmp/evame-start-suspense.log`
- URL: `http://localhost:3000/ja`

### Desktop 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 1452,
    "TTFB": 193.52000000476838
  },
  "results": [
    {
      "run": 1,
      "fcp": 1812,
      "ttfb": 420.80000001192093,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 2,
      "fcp": 1792,
      "ttfb": 174.20000004768372,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 3,
      "fcp": 1284,
      "ttfb": 126.79999995231628,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 4,
      "fcp": 1276,
      "ttfb": 102.10000002384186,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 5,
      "fcp": 1096,
      "ttfb": 143.69999998807907,
      "url": "http://localhost:3000/ja"
    }
  ]
}

### Mobile 5-run 平均
{
  "runs": 5,
  "average": {
    "FCP": 1541.6,
    "TTFB": 165.17999999523164
  },
  "results": [
    {
      "run": 1,
      "fcp": 1164,
      "ttfb": 167.30000001192093,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 2,
      "fcp": 1156,
      "ttfb": 148.80000001192093,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 3,
      "fcp": 1260,
      "ttfb": 169,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 4,
      "fcp": 1040,
      "ttfb": 173.5999999642372,
      "url": "http://localhost:3000/ja"
    },
    {
      "run": 5,
      "fcp": 3088,
      "ttfb": 167.19999998807907,
      "url": "http://localhost:3000/ja"
    }
  ]
}
