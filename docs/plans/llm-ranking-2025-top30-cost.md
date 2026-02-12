# LLM比較表（性能 + コスト）: Qualiteg LLM Ranking 2025 上位50

- 作成日: 2026-02-11
- 性能データ: [Qualiteg「最新版LLMランキング 2025」](https://blog.qualiteg.com/llm-ranking-2025/) の「総合スコアランキング TOP50」を使用（ベンチマーク日付: 2025-12-18）。
- コストデータ: [OpenRouter Models API](https://openrouter.ai/api/v1/models) の公開価格（USD/token）を 1M token 単位に換算。
- 注意: `high-effort` / `extended-thinking` / `reasoning` は同一モデルでも推論トークン消費量で実効コストが増減します。以下は単価比較です。

## 1. ランキング順（性能順）

| 順位 | モデル（ランキング表記） | 総合スコア | コスト参照モデル | 入力単価 (USD/1M) | 出力単価 (USD/1M) | 合計単価 (入力+出力) | 備考 |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| 1 | openai/gpt-5.2-2025-12-11: xhigh-effort | 0.8285 | openai/gpt-5.2 | $1.75 | $14.00 | $15.75 | モード差で実効コスト変動 |
| 2 | google/gemini-3-pro-preview | 0.8134 | google/gemini-3-pro-preview | $2.00 | $12.00 | $14.00 | - |
| 3 | openai/gpt-5.1-2025-11-13: high-effort | 0.8085 | openai/gpt-5.1 | $1.25 | $10.00 | $11.25 | モード差で実効コスト変動 |
| 4 | anthropic/claude-opus-4.5-20251125: extended-thinking | 0.8064 | anthropic/claude-opus-4.5 | $5.00 | $25.00 | $30.00 | モード差で実効コスト変動 |
| 5 | anthropic/claude-opus-4-1-20250805: extended-thinking | 0.7992 | anthropic/claude-opus-4.1 | $15.00 | $75.00 | $90.00 | モード差で実効コスト変動 |
| 6 | openai/gpt-5-2025-08-07: high-effort | 0.7970 | openai/gpt-5 | $1.25 | $10.00 | $11.25 | モード差で実効コスト変動 |
| 7 | anthropic/claude-sonnet-4-5-20250929: extended-thinking | 0.7954 | anthropic/claude-sonnet-4.5 | $3.00 | $15.00 | $18.00 | モード差で実効コスト変動 |
| 8 | anthropic/claude-sonnet-4-20250514: extended-thinking | 0.7918 | anthropic/claude-sonnet-4 | $3.00 | $15.00 | $18.00 | モード差で実効コスト変動 |
| 9 | deepseek/DeepSeek-V3.2 (Thinking Mode) | 0.7905 | deepseek/deepseek-v3.2 | $0.25 | $0.38 | $0.63 | - |
| 10 | anthropic/claude-haiku-4-5-20251001: extended-thinking | 0.7879 | anthropic/claude-haiku-4.5 | $1.00 | $5.00 | $6.00 | モード差で実効コスト変動 |
| 11 | openai/o3-2025-04-16: high-effort | 0.7876 | openai/o3 | $2.00 | $8.00 | $10.00 | モード差で実効コスト変動 |
| 12 | grok-4 | 0.7810 | x-ai/grok-4 | $3.00 | $15.00 | $18.00 | - |
| 13 | anthropic/claude-opus-4-20250514: no-thinking | 0.7804 | anthropic/claude-opus-4 | $15.00 | $75.00 | $90.00 | - |
| 14 | openai/o1-2024-12-17: high-effort | 0.7753 | openai/o1 | $15.00 | $60.00 | $75.00 | モード差で実効コスト変動 |
| 15 | anthropic/claude-3.7-sonnet-20250219: extended-thinking | 0.7734 | anthropic/claude-3.7-sonnet:thinking | $3.00 | $15.00 | $18.00 | モード差で実効コスト変動 |
| 16 | google/gemini-2.5-pro | 0.7696 | google/gemini-2.5-pro | $1.25 | $10.00 | $11.25 | - |
| 17 | x-ai/grok-4-1-fast-reasoning | 0.7646 | x-ai/grok-4.1-fast | $0.20 | $0.50 | $0.70 | モード差で実効コスト変動 |
| 18 | Qwen/Qwen3-235B-A22B-Thinking-2507: reasoning-enabled | 0.7638 | qwen/qwen3-235b-a22b-thinking-2507 | $0.11 | $0.60 | $0.71 | モード差で実効コスト変動 |
| 19 | openai/o4-mini-2025-04-16 | 0.7610 | openai/o4-mini | $1.10 | $4.40 | $5.50 | - |
| 20 | deepseek-ai/DeepSeek-R1-0528: reasoning-enabled | 0.7432 | deepseek/deepseek-r1-0528 | $0.40 | $1.75 | $2.15 | モード差で実効コスト変動 |
| 21 | openai/o3-mini-2025-01-31 | 0.7430 | openai/o3-mini | $1.10 | $4.40 | $5.50 | - |
| 22 | Qwen/Qwen3-Max-Preview | 0.7425 | qwen/qwen3-max | $1.20 | $6.00 | $7.20 | - |
| 23 | openai/gpt-5.1-2025-11-13: none-effort | 0.7412 | openai/gpt-5.1 | $1.25 | $10.00 | $11.25 | - |
| 24 | grok-3-mini | 0.7370 | x-ai/grok-3-mini | $0.30 | $0.50 | $0.80 | - |
| 25 | Qwen/Qwen3-Next-80B-A3B-Thinking: reasoning-enabled | 0.7356 | qwen/qwen3-next-80b-a3b-thinking | $0.15 | $1.20 | $1.35 | モード差で実効コスト変動 |
| 26 | zai-org/GLM-4.6-FP8: reasoning-enabled | 0.7337 | z-ai/glm-4.6 | $0.35 | $1.50 | $1.85 | モード差で実効コスト変動 |
| 27 | moonshotai/kimi-k2-thinking | 0.7332 | moonshotai/kimi-k2-thinking | $0.40 | $1.75 | $2.15 | - |
| 28 | anthropic/claude-opus-4.5-20251125: no-thinking | 0.7320 | anthropic/claude-opus-4.5 | $5.00 | $25.00 | $30.00 | - |
| 29 | Qwen/Qwen3-VL-32B-Thinking | 0.7287 | N/A | N/A | N/A | N/A | 公開価格マッピング不可 |
| 30 | upstage-karakuri/syn-pro reasoning | 0.7273 | N/A | N/A | N/A | N/A | 公開価格マッピング不可 |
| 31 | openai/gpt-4-1-2025-04-14 | 0.7261 | openai/gpt-4.1 | $2.00 | $8.00 | $10.00 | - |
| 32 | grok-3 | 0.7253 | x-ai/grok-3 | $3.00 | $15.00 | $18.00 | - |
| 33 | Qwen/Qwen3-14B: reasoning-enabled | 0.7233 | qwen/qwen3-14b | $0.05 | $0.22 | $0.27 | モード差で実効コスト変動 |
| 34 | openai/gpt-4o-2024-11-20 | 0.7223 | openai/gpt-4o-2024-11-20 | $2.50 | $10.00 | $12.50 | - |
| 35 | Qwen/Qwen3-235B-A22B: reasoning-enabled | 0.7214 | qwen/qwen3-235b-a22b | $0.22 | $0.88 | $1.10 | モード差で実効コスト変動 |
| 36 | anthropic/claude-3.7-sonnet-20250219: no-thinking | 0.7177 | anthropic/claude-3.7-sonnet | $3.00 | $15.00 | $18.00 | - |
| 37 | openai/gpt-5-nano-2025-08-07: high-effort | 0.7174 | openai/gpt-5-nano | $0.05 | $0.40 | $0.45 | モード差で実効コスト変動 |
| 38 | anthropic/claude-sonnet-4-20250514: no-thinking | 0.7155 | anthropic/claude-sonnet-4 | $3.00 | $15.00 | $18.00 | - |
| 39 | Qwen/Qwen3-Next-80B-A3B-Instruct | 0.7130 | qwen/qwen3-next-80b-a3b-instruct | $0.09 | $1.10 | $1.19 | - |
| 40 | MiniMaxAI/MiniMax-M2: reasoning-enabled | 0.7126 | minimax/minimax-m2 | $0.26 | $1.00 | $1.25 | モード差で実効コスト変動 |
| 41 | Qwen/Qwen3-30B-A3B-Thinking-2507: reasoning-enabled | 0.7093 | qwen/qwen3-30b-a3b-thinking-2507 | $0.05 | $0.34 | $0.39 | モード差で実効コスト変動 |
| 42 | Qwen/Qwen3-32B: reasoning-enabled | 0.7083 | qwen/qwen3-32b | $0.08 | $0.24 | $0.32 | モード差で実効コスト変動 |
| 43 | anthropic/claude-3.5-sonnet-20241022 | 0.7058 | anthropic/claude-3.5-sonnet | $6.00 | $30.00 | $36.00 | - |
| 44 | zai-org/GLM-4.5-Air | 0.7045 | z-ai/glm-4.5-air | $0.13 | $0.85 | $0.98 | - |
| 45 | Qwen/Qwen3-30B-A3B: reasoning-enabled | 0.7035 | qwen/qwen3-30b-a3b | $0.06 | $0.22 | $0.28 | モード差で実効コスト変動 |
| 46 | Qwen/QwQ-32B: reasoning-enabled | 0.7029 | qwen/qwq-32b | $0.15 | $0.40 | $0.55 | モード差で実効コスト変動 |
| 47 | openai/gpt-oss-120b: reasoning-enabled | 0.7014 | openai/gpt-oss-120b | $0.04 | $0.19 | $0.23 | モード差で実効コスト変動 |
| 48 | openai/gpt-4-1-mini-2025-04-14 | 0.6992 | openai/gpt-4.1-mini | $0.40 | $1.60 | $2.00 | - |
| 49 | google/gemini-2.5-flash | 0.6969 | google/gemini-2.5-flash | $0.30 | $2.50 | $2.80 | - |
| 50 | rinna/qwq-bakeneko-32b: reasoning-enabled | 0.6910 | N/A | N/A | N/A | N/A | 公開価格マッピング不可 |

## 2. コスト安い順（公開単価ベース）

| コスト順 | ランキング順位 | モデル（ランキング表記） | 総合スコア | 入力単価 (USD/1M) | 出力単価 (USD/1M) | 合計単価 (入力+出力) |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | 47 | openai/gpt-oss-120b: reasoning-enabled | 0.7014 | $0.04 | $0.19 | $0.23 |
| 2 | 33 | Qwen/Qwen3-14B: reasoning-enabled | 0.7233 | $0.05 | $0.22 | $0.27 |
| 3 | 45 | Qwen/Qwen3-30B-A3B: reasoning-enabled | 0.7035 | $0.06 | $0.22 | $0.28 |
| 4 | 42 | Qwen/Qwen3-32B: reasoning-enabled | 0.7083 | $0.08 | $0.24 | $0.32 |
| 5 | 41 | Qwen/Qwen3-30B-A3B-Thinking-2507: reasoning-enabled | 0.7093 | $0.05 | $0.34 | $0.39 |
| 6 | 37 | openai/gpt-5-nano-2025-08-07: high-effort | 0.7174 | $0.05 | $0.40 | $0.45 |
| 7 | 46 | Qwen/QwQ-32B: reasoning-enabled | 0.7029 | $0.15 | $0.40 | $0.55 |
| 8 | 9 | deepseek/DeepSeek-V3.2 (Thinking Mode) | 0.7905 | $0.25 | $0.38 | $0.63 |
| 9 | 17 | x-ai/grok-4-1-fast-reasoning | 0.7646 | $0.20 | $0.50 | $0.70 |
| 10 | 18 | Qwen/Qwen3-235B-A22B-Thinking-2507: reasoning-enabled | 0.7638 | $0.11 | $0.60 | $0.71 |
| 11 | 24 | grok-3-mini | 0.7370 | $0.30 | $0.50 | $0.80 |
| 12 | 44 | zai-org/GLM-4.5-Air | 0.7045 | $0.13 | $0.85 | $0.98 |
| 13 | 35 | Qwen/Qwen3-235B-A22B: reasoning-enabled | 0.7214 | $0.22 | $0.88 | $1.10 |
| 14 | 39 | Qwen/Qwen3-Next-80B-A3B-Instruct | 0.7130 | $0.09 | $1.10 | $1.19 |
| 15 | 40 | MiniMaxAI/MiniMax-M2: reasoning-enabled | 0.7126 | $0.26 | $1.00 | $1.25 |
| 16 | 25 | Qwen/Qwen3-Next-80B-A3B-Thinking: reasoning-enabled | 0.7356 | $0.15 | $1.20 | $1.35 |
| 17 | 26 | zai-org/GLM-4.6-FP8: reasoning-enabled | 0.7337 | $0.35 | $1.50 | $1.85 |
| 18 | 48 | openai/gpt-4-1-mini-2025-04-14 | 0.6992 | $0.40 | $1.60 | $2.00 |
| 19 | 20 | deepseek-ai/DeepSeek-R1-0528: reasoning-enabled | 0.7432 | $0.40 | $1.75 | $2.15 |
| 20 | 27 | moonshotai/kimi-k2-thinking | 0.7332 | $0.40 | $1.75 | $2.15 |
| 21 | 49 | google/gemini-2.5-flash | 0.6969 | $0.30 | $2.50 | $2.80 |
| 22 | 19 | openai/o4-mini-2025-04-16 | 0.7610 | $1.10 | $4.40 | $5.50 |
| 23 | 21 | openai/o3-mini-2025-01-31 | 0.7430 | $1.10 | $4.40 | $5.50 |
| 24 | 10 | anthropic/claude-haiku-4-5-20251001: extended-thinking | 0.7879 | $1.00 | $5.00 | $6.00 |
| 25 | 22 | Qwen/Qwen3-Max-Preview | 0.7425 | $1.20 | $6.00 | $7.20 |
| 26 | 11 | openai/o3-2025-04-16: high-effort | 0.7876 | $2.00 | $8.00 | $10.00 |
| 27 | 31 | openai/gpt-4-1-2025-04-14 | 0.7261 | $2.00 | $8.00 | $10.00 |
| 28 | 3 | openai/gpt-5.1-2025-11-13: high-effort | 0.8085 | $1.25 | $10.00 | $11.25 |
| 29 | 6 | openai/gpt-5-2025-08-07: high-effort | 0.7970 | $1.25 | $10.00 | $11.25 |
| 30 | 16 | google/gemini-2.5-pro | 0.7696 | $1.25 | $10.00 | $11.25 |
| 31 | 23 | openai/gpt-5.1-2025-11-13: none-effort | 0.7412 | $1.25 | $10.00 | $11.25 |
| 32 | 34 | openai/gpt-4o-2024-11-20 | 0.7223 | $2.50 | $10.00 | $12.50 |
| 33 | 2 | google/gemini-3-pro-preview | 0.8134 | $2.00 | $12.00 | $14.00 |
| 34 | 1 | openai/gpt-5.2-2025-12-11: xhigh-effort | 0.8285 | $1.75 | $14.00 | $15.75 |
| 35 | 7 | anthropic/claude-sonnet-4-5-20250929: extended-thinking | 0.7954 | $3.00 | $15.00 | $18.00 |
| 36 | 8 | anthropic/claude-sonnet-4-20250514: extended-thinking | 0.7918 | $3.00 | $15.00 | $18.00 |
| 37 | 12 | grok-4 | 0.7810 | $3.00 | $15.00 | $18.00 |
| 38 | 15 | anthropic/claude-3.7-sonnet-20250219: extended-thinking | 0.7734 | $3.00 | $15.00 | $18.00 |
| 39 | 32 | grok-3 | 0.7253 | $3.00 | $15.00 | $18.00 |
| 40 | 36 | anthropic/claude-3.7-sonnet-20250219: no-thinking | 0.7177 | $3.00 | $15.00 | $18.00 |
| 41 | 38 | anthropic/claude-sonnet-4-20250514: no-thinking | 0.7155 | $3.00 | $15.00 | $18.00 |
| 42 | 4 | anthropic/claude-opus-4.5-20251125: extended-thinking | 0.8064 | $5.00 | $25.00 | $30.00 |
| 43 | 28 | anthropic/claude-opus-4.5-20251125: no-thinking | 0.7320 | $5.00 | $25.00 | $30.00 |
| 44 | 43 | anthropic/claude-3.5-sonnet-20241022 | 0.7058 | $6.00 | $30.00 | $36.00 |
| 45 | 14 | openai/o1-2024-12-17: high-effort | 0.7753 | $15.00 | $60.00 | $75.00 |
| 46 | 5 | anthropic/claude-opus-4-1-20250805: extended-thinking | 0.7992 | $15.00 | $75.00 | $90.00 |
| 47 | 13 | anthropic/claude-opus-4-20250514: no-thinking | 0.7804 | $15.00 | $75.00 | $90.00 |
| 48 | 29 | Qwen/Qwen3-VL-32B-Thinking | 0.7287 | N/A | N/A | N/A |
| 49 | 30 | upstage-karakuri/syn-pro reasoning | 0.7273 | N/A | N/A | N/A |
| 50 | 50 | rinna/qwq-bakeneko-32b: reasoning-enabled | 0.6910 | N/A | N/A | N/A |

## 3. 補足

- `Qwen/Qwen3-VL-32B-Thinking`、`upstage-karakuri/syn-pro reasoning`、`rinna/qwq-bakeneko-32b: reasoning-enabled` は、取得時点のOpenRouter公開モデル一覧に同名・同等名が見つからず `N/A` としています。
- モデルIDの世代/日付サフィックスが異なる場合は、同系列の現行公開モデルへマッピングしています。

## 4. API安定性（公開データ, 2025-11-13〜2026-02-11）

- 重要: 各社で「インシデントの粒度」「公開件数上限」「対象サービス範囲」が異なるため、単純比較はできません。
- 集計は公開ステータス/公開インシデントの取得可能範囲で行っています（最新50件上限のサービスあり）。

| 事業者/経路 | 公開データ観測 | 90日の観測結果（取得範囲） | メモ |
| --- | --- | --- | --- |
| OpenAI | `status.openai.com`（埋め込み履歴） | 58件（API関連っぽいタイトル 10件） | ChatGPT系も混在。API専用件数ではない |
| Anthropic (Claude) | `status.claude.com/api/v2/incidents.json` | 50件中、Claude APIコンポーネント関連 34件（major/critical 8件） | APIが返す最新50件内での集計 |
| Google (Vertex Gemini API) | `status.cloud.google.com/incidents.json` | Vertex Gemini APIを含む障害は取得全体で1件（2025-06-12〜06-13）、90日では0件 | GCP全体障害データの一部として公開 |
| DeepSeek | `status.deepseek.com/api/v2/incidents.json` | API名を含む障害 8件（major/critical 4件） | 2025-11-25以降に集中 |
| Moonshot (Kimi) | `status.moonshot.cn/api/v2/incidents.json` | 最新50件はすべて Search コンポーネント、Open API/API Service直接影響 0件 | API直接影響が0件という意味ではなく、最新50件の観測結果 |
| OpenRouter | `status.openrouter.ai` | 90日 uptime 表示: Chat API 100%, Data API 99.93% | ルーティング層の可用性指標 |
| xAI | `status.x.ai` | 自動取得でCloudflareブロック | 手動確認が必要 |

## 5. 業務利用の判断（実務向け）

| 判定 | 条件 | 推奨 |
| --- | --- | --- |
| A: クリティカル業務向け | SLO/監査/予算管理が必須 | Google Vertex AI + Provisioned Throughput（固定容量）を第一候補。必要なら別ベンダーをフェイルオーバーに追加 |
| B: 一般的なSaaS運用 | 数分程度の劣化を吸収できる | OpenAI / Anthropic を主系にし、2社目を待機系として設定 |
| C: コスト最優先運用 | 非同期バッチ中心、一時的失敗を再試行できる | DeepSeek / Qwen / Kimi を採用し、キュー処理＋再試行前提にする |

## 6. どこで使うと良いか（結論）

1. 顧客向け本番チャット・エージェント
`Gemini 2.5 Pro/3 Pro (Vertex)` を主系。理由: Provisioned Throughput（固定容量）とVertex AI SLAがあるため。
2. 開発支援・コーディング系
`Claude Sonnet 4.5` 主系、`GPT-5.1` か `o4-mini` を待機系。理由: 品質と代替経路の両立がしやすい。
3. 大量バッチ・コスト重視
`DeepSeek V3.2` や `Qwen3 Thinking`。理由: 単価が低く、非同期再試行と相性が良い。
4. モデル切替を速く回したい
`OpenRouter`。理由: 単一APIで複数モデル切替が可能。厳格な法務/監査要件がある場合は直契約を優先。

## 7. 参考リンク（公開一次情報）

- Qualiteg LLMランキング: https://blog.qualiteg.com/llm-ranking-2025/
- OpenRouter Models API: https://openrouter.ai/api/v1/models
- OpenAI Status: https://status.openai.com/
- Claude Status API: https://status.claude.com/api/v2/summary.json
- Claude Incidents API: https://status.claude.com/api/v2/incidents.json
- Google Cloud Incident Feed: https://status.cloud.google.com/incidents.json
- Vertex AI Provisioned Throughput: https://cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput
- Vertex AI SLA: https://cloud.google.com/vertex-ai/sla
- DeepSeek Status API: https://status.deepseek.com/api/v2/summary.json
- DeepSeek Incidents API: https://status.deepseek.com/api/v2/incidents.json
- Moonshot Status API: https://status.moonshot.cn/api/v2/summary.json
- Moonshot Incidents API: https://status.moonshot.cn/api/v2/incidents.json
- OpenRouter Status: https://status.openrouter.ai
- Anthropic Rate limits docs: https://docs.anthropic.com/en/api/rate-limits

## 8. API経路を増やした比較（どこから使えるか）

- 基準日: 2026-02-11
- 「直API」「クラウドマネージド」「ルーター」「ゲートウェイ」を分けて整理。

| 区分 | 経路 | 使えるモデル例（公開情報） | 安定性/運用の公開情報 | どこで使うのが良いか |
| --- | --- | --- | --- | --- |
| クラウドマネージド | AWS Bedrock | Claude / Cohere / DeepSeek / Llama / Mistral など | Bedrock SLA（Monthly Uptime Percentage と Service Credit）公開 | 監査・権限管理・請求統合をAWSで完結したい本番 |
| クラウドマネージド | Google Vertex AI | Gemini 3/2.5 + Partner models（Claude / Llama） | Vertex AI SLA公開、DSQで429あり、Provisioned Throughputで固定容量予約可 | クリティカル本番（安定性と予算予測を重視） |
| クラウドマネージド | Azure OpenAI / Foundry | Azure OpenAI系 + 一部他社モデル | Microsoft Foundry上でモデル販売。Previewは本番非推奨の明記あり | Azure基盤に統合した企業運用 |
| 直API | OpenAI API | GPT-5.2 / GPT-5系 / o系 ほか | 最新モデル公開が速い。status.openai.com で可視化 | 最新機能を最速で使いたい場合 |
| 直API | Anthropic API | Claude 4.6/4.5/4系 | `api.anthropic.com` + status.claude.com | Claude品質を直接使う主系 |
| 直API | Gemini API (AI Studio) | Gemini 3/2.5系 | ai.google.dev でモデル・制限情報を公開 | Geminiを軽量に試すPoC |
| 直API | DeepSeek API | `deepseek-chat` / `deepseek-reasoner`（V3.2系） | OpenAI互換API形式。status.deepseek.com で公開 | 低単価バッチ、推論コスト最適化 |
| 直API | Moonshot API (Kimi) | moonshot-v1系、`kimi-k2.5` | `kimi-latest` は 2026-01-28 廃止。status.moonshot.cn で公開 | Kimiを直に使いたい時 |
| 直API | Qwen (Alibaba Model Studio) | Qwen API reference公開 | DashScope/Model Studio側で運用（経路は中国系） | Qwen直利用が必要なケース |
| 高速推論API | Groq | Llama / Qwen / Kimi / OSS系など | rate limits は組織単位（RPM/RPD/TPM/TPD）。groqstatus.com 公開 | 低遅延優先のオンライン推論 |
| ルーター | OpenRouter | OpenAI / Anthropic / Google / xAI / DeepSeek / Qwen / Moonshot 等 | 単一エンドポイント + fallback。status公開 | 多モデル検証・迅速な切替 |
| ルーター | Together AI | DeepSeek / Qwen / Llama / Mistral 等 | serverless models 公開、無料枠は厳しめ制限あり | OSS系を幅広く安く試す |
| ルーター | Fireworks AI | DeepSeek / Qwen / Kimi / Llama 等 | モデルカタログで単価と文脈長を公開 | OSS/中華系モデルの高速導入 |
| ゲートウェイ | Cloudflare AI Gateway | Bedrock / Anthropic / Azure OpenAI / DeepSeek / Vertex / Groq / OpenRouter 等を接続可 | プロバイダー接続一覧が公開 | 既存複数APIを1つの入口で統制したい時 |
| エッジ推論 | Cloudflare Workers AI | Llama / Qwen / DeepSeek distill など | Workers AIモデル一覧を公開 | エッジ近接で軽量推論を回す時 |
| 汎用ホスティング | Replicate | 多数のOSSモデルをPrediction APIで実行 | ドキュメントでprediction実行手順を公開 | 実験・非同期ジョブ中心 |
| 直API | Mistral API | Mistral Large/Medium/Small、Codestral等 | 公式でモデル一覧・バージョン/廃止予定を公開 | Mistral系を主軸にする時 |
| 直API | Cohere API | Command / Embed / Rerank / Aya | モデル一覧と用途別エンドポイント公開 | RAG・検索強化・多言語業務 |

## 9. モデルファミリ別「どこから使えるか」マップ

| モデルファミリ | 直API | クラウド経由 | ルーター/その他 |
| --- | --- | --- | --- |
| OpenAI GPT / o | OpenAI | Azure OpenAI (Foundry) | OpenRouter |
| Anthropic Claude | Anthropic | AWS Bedrock / Google Vertex AI | OpenRouter |
| Google Gemini | Gemini API (AI Studio) | Google Vertex AI | OpenRouter |
| DeepSeek | DeepSeek API | AWS Bedrock（DeepSeekモデル提供あり） | OpenRouter / Together / Fireworks / Cloudflare AI Gateway |
| Qwen | Alibaba Model Studio (Qwen API) | - | OpenRouter / Groq（一部） / Together / Fireworks / Cloudflare AI Gateway |
| Kimi (Moonshot) | Moonshot API | - | OpenRouter / Groq（一部） / Fireworks / Cloudflare AI Gateway |
| Llama | -（Meta直提供ではなく各社経由が中心） | AWS Bedrock / Vertex partner models | Groq / Together / Fireworks / Workers AI / OpenRouter |
| Mistral | Mistral API | AWS Bedrock（Mistral提供） | Together / Fireworks / OpenRouter |
| Cohere | Cohere API | AWS Bedrock（Cohere提供） | - |

## 10. 安定性観点の実務メモ（公開データの範囲）

| 経路/事業者 | 観測結果（2025-11-13〜2026-02-11） | 実務判断 |
| --- | --- | --- |
| DeepSeek 直API | API関連 90日 8件、major/critical 4件。現時点は operational | 単独主系は避け、必ず fallback 付きで使う |
| Moonshot 直API | 最新50件範囲で Open API/API Service 直接影響 0件。現時点は operational | API障害は観測上少なめだが、可視範囲制約あり |
| Groq | 90日 10件、major 1件。現時点 API operational | 低遅延用途に強いが、重要系は2経路化推奨 |
| OpenRouter | Status上 All Systems Operational、直近14日インシデントなし | ルーティング用途として有効。法務要件次第で直契約併用 |
| Vertex AI | SLA公開、DSQ時は429あり。PTで固定容量予約可 | クリティカル用途はPT前提が安全 |
| Bedrock | SLA公開（MUPベースのクレジット規定） | 企業本番向け。モデル多様性とAWS統制を両立 |

## 11. どこから使うべきか（最終推奨）

1. 収益直結の本番機能（停止コストが高い）
`Vertex AI (PT)` か `AWS Bedrock` を主系にし、`OpenAI` or `Anthropic` 直APIを待機系にする。
2. 速い検証とモデル探索
`OpenRouter` を入口にして候補を絞り、当たりモデルだけ直契約へ移す。
3. コスト最優先の非同期処理
`DeepSeek / Qwen / Kimi` を `Together / Fireworks / OpenRouter` も含めて比較し、失敗前提（再試行・キュー）で運用する。
4. 低遅延要件
`Groq` を主候補にし、同品質帯モデルを別経路にも用意して切替可能にする。
5. 複数ベンダー統制が必要
`Cloudflare AI Gateway` などのゲートウェイを入口にし、監視/制御を一元化する。

### DeepSeek個別の結論（安定性最優先）

- 最優先候補: `AWS Bedrock` 経由
- 理由: BedrockはSLAが公開され、DeepSeek直APIより業務運用の可用性設計（権限/監査/請求統合）がしやすい
- 推奨構成: Bedrock主系（例 `us-east-1`）+ 別リージョン待機系（例 `us-west-2`）+ タイムアウト/再試行/サーキットブレーカ

## 12. 追加の一次情報リンク

- OpenAI Models: https://platform.openai.com/docs/models
- Anthropic API Overview: https://docs.anthropic.com/en/api/overview
- Gemini API Models: https://ai.google.dev/gemini-api/docs/models
- AWS Bedrock Supported Models: https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html
- AWS Bedrock SLA: https://aws.amazon.com/bedrock/sla/
- Vertex AI Models: https://cloud.google.com/vertex-ai/generative-ai/docs/models
- Vertex AI Provisioned Throughput: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/resources/provisioned-throughput
- Vertex AI SLA: https://cloud.google.com/vertex-ai/sla
- Azure OpenAI Models (Foundry): https://learn.microsoft.com/en-us/azure/ai-services/openai/overview
- Groq Models: https://console.groq.com/docs/models
- Groq Rate Limits: https://console.groq.com/docs/rate-limits
- Groq Status API: https://groqstatus.com/api/v2/summary.json
- Groq Incidents API: https://groqstatus.com/api/v2/incidents.json
- OpenRouter Docs: https://openrouter.ai/docs
- OpenRouter Models API: https://openrouter.ai/api/v1/models
- OpenRouter Status: https://status.openrouter.ai
- DeepSeek API Docs: https://api-docs.deepseek.com/
- Moonshot Docs: https://platform.moonshot.ai/docs/introduction
- Moonshot Status API: https://status.moonshot.cn/api/v2/summary.json
- Alibaba Cloud Qwen API reference: https://www.alibabacloud.com/help/en/model-studio/developer-reference/use-qwen-by-calling-api
- Together Serverless Models: https://docs.together.ai/docs/serverless-models
- Fireworks Models: https://fireworks.ai/models
- Cloudflare AI Gateway: https://developers.cloudflare.com/ai-gateway/
- Cloudflare Workers AI Models: https://developers.cloudflare.com/workers-ai/models/
- Replicate Docs: https://replicate.com/docs/get-started/python
- Mistral Models: https://docs.mistral.ai/getting-started/models/models_overview/
- Cohere Models: https://docs.cohere.com/docs/models
