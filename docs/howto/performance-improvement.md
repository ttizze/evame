# パフォーマンス改善の測定手順

変更の効果を比較できるように、同じ条件で「変更前」「変更後」を計測します。

## 1. 変更ごとにログフォルダーを作る

- 例: `/tmp/evame-perf/20260205-change-xx-<slug>/`
- 変更前/後を分ける

```
/tmp/evame-perf/20260205-change-xx-<slug>/
  before/
    build.log
    server.log
    run-1.json
    run-2.json
    run-3.json
    run-4.json
    run-5.json
    summary.json
  after/
    build.log
    server.log
    run-1.json
    run-2.json
    run-3.json
    run-4.json
    run-5.json
    summary.json
```

## 2. 変更前に 5 回計測する

1. ビルド
2. サーバー起動（ログをファイルに保存）
3. 5回計測してログに保存
4. 5回の平均を `summary.json` に出す

例:

```bash
CHANGE_ID=20260205-change-xx-<slug>
LOG_ROOT=/tmp/evame-perf/$CHANGE_ID
PORT=3105

mkdir -p $LOG_ROOT/before

# build
bun run build > $LOG_ROOT/before/build.log 2>&1

# start
PORT=$PORT PERF_LOG=1 bun run start > $LOG_ROOT/before/server.log 2>&1 &
START_PID=$!

# measure (5 runs)
for i in 1 2 3 4 5; do
  node /path/to/perf-script.js --url http://localhost:$PORT/ja > $LOG_ROOT/before/run-$i.json
  sleep 1
done

# summarize (example)
jq -s '{
  count: length,
  fcpAvgMs: (map(.perf.paints[] | select(.name=="first-contentful-paint") | .startTime) | add/length),
  lcpAvgMs: (map(.perf.lcp) | add/length),
  ttfbAvgMs: (map(.perf.nav.responseStart) | add/length)
}' $LOG_ROOT/before/run-*.json > $LOG_ROOT/before/summary.json

# stop
kill $START_PID
```

## 3. 変更後に 5 回計測する

変更を入れたら、同じ条件で 5 回計測して `after/` に保存します。

- ビルド
- サーバー起動
- 5回計測
- 平均を `summary.json` に出す

## 4. 比較して効果を分析する

- `before/summary.json` と `after/summary.json` を比較
- どの指標が改善/悪化したかを記録
- 異常値がある場合は、ログを見て原因を特定する

### 目安
- FCP/LCP が短縮されていれば体感改善に繋がる
- TTFB が増えていればサーバー側の負荷増加の可能性あり

