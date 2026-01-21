# ADR: 言語検出ライブラリの選定

- 日付: 2026-01-21
- ステータス: 採用
- 関連要件: HTMLコンテンツからの言語自動検出

## 背景

ユーザーが作成したページの言語を自動検出する機能で、`cld3-asm`（WebAssembly版CLD3）を使用していた。しかし、Next.jsサーバーレス環境でWASMの初期化がタイムアウトする問題が発生した。

```
Error: Timeout to initialize runtime
  still waiting on run dependencies:
  dependency: wasm-instantiate
```

## 問題

1. **WASM初期化タイムアウト**: cld3-asmはWASMを使用しており、コールドスタート時に初期化に時間がかかる
2. **短文検出**: cld3-asmは短いテキスト（~100文字未満）で`und`（不明）を返す
3. **サポート言語**: アプリは21言語をサポートしており、全て検出できる必要がある

## 判断

**cld (CLD2)** を採用する。

| 項目 | cld (CLD2) |
|------|-----------|
| 初回 | 1.2ms |
| 検出/回 | 0.08ms |
| 21言語対応 | 21/21 通過 |
| 短文検出 | ✅ (bestEffort: true) |
| WASM | なし（ネイティブバインディング） |

## 代替案

### 1. cld3-asm (却下)
- **良い点**: Google製CLD3、高精度
- **問題**: WASM初期化タイムアウト、短文で検出不可

### 2. franc (却下)
- **良い点**: 純粋JS、300+言語対応
- **問題**: インドネシア語をマレー語として検出、ISO 639-3→2変換が必要

### 3. eld (却下)
- **良い点**: 純粋JS、短文検出可能
- **問題**: インドネシア語非サポート（マレー語として検出）

## 比較表

| ライブラリ | 初回 | 検出/回 | インドネシア語 | 短文 | WASM |
|-----------|------|--------|:-------------:|:----:|:----:|
| **cld** | 1.2ms | 0.08ms | ✅ | ✅ | なし |
| cld3-asm | 72ms | 0.08ms | ✅ | ❌ | あり |
| franc | 20ms | 0.4ms | ❌ (zlm) | ✅ | なし |
| eld | 280ms | 0.3ms | ❌ (ms) | ✅ | なし |

## 影響

1. **パフォーマンス改善**: WASM初期化なしで即座に使用可能
2. **安定性向上**: タイムアウトエラーが解消
3. **短文対応**: `bestEffort: true`で短文も検出可能

## 実装メモ

```typescript
import cld from "cld";

const result = await cld.detect(text, { bestEffort: true });
const language = result.languages[0]?.code ?? "und";

// パーリ語(pi)はサンスクリット語(sa)として検出されるので変換
if (language === "sa") {
  return "pi";
}
```

### 注意点

- パーリ語(`pi`)はサンスクリット語(`sa`)として検出される → 変換で対応
- `bestEffort: true`を指定しないと短文でエラーになる場合がある
