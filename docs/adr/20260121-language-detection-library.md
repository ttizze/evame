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

その後、`cld`（CLD2ネイティブバインディング）を試したが、Turbopackがネイティブモジュールをサポートしていないためビルドに失敗した。

```
Error: Turbopack build failed with 1 errors:
./node_modules/cld/index.js
non-ecmascript placeable asset
```

## 問題

1. **WASM初期化タイムアウト**: cld3-asmはWASMを使用しており、コールドスタート時に初期化に時間がかかる
2. **ネイティブモジュール非対応**: cldはネイティブバインディングを使用しており、Turbopackでビルドできない
3. **短文検出**: cld3-asmは短いテキスト（~100文字未満）で`und`（不明）を返す

## 判断

**franc** を採用する。一部言語は検出不可だがuserLocaleにフォールバックする。

| 項目 | franc |
|------|-------|
| 初回 | 20ms |
| 検出/回 | 0.4ms |
| 検出可能言語 | 18/21 |
| 短文検出 | ✅ |
| WASM | なし（純粋JS） |
| Turbopack | ✅ 対応 |

### 検出可能な言語（18言語）

en, zh, es, ar, pt, fr, ja, ru, de, vi, ko, tr, it, th, pl, nl, tl, hi

### 検出不可な言語（3言語）→ userLocaleにフォールバック

- **id** (インドネシア語): マレー語(zlm)として検出される
- **fa** (ペルシャ語): ダリー語(prs)として検出される
- **pi** (パーリ語): 正しく検出されない

## 代替案

### 1. cld3-asm (却下)
- **良い点**: Google製CLD3、高精度
- **問題**: WASM初期化タイムアウト、短文で検出不可

### 2. cld (却下)
- **良い点**: 高速、21言語すべて対応
- **問題**: ネイティブバインディングのためTurbopackでビルド不可

### 3. eld (却下)
- **良い点**: 純粋JS、短文検出可能
- **問題**: インドネシア語非サポート（マレー語として検出）、初回280msと遅い

## 比較表

| ライブラリ | 初回 | 検出/回 | 21言語対応 | 短文 | Turbopack |
|-----------|------|--------|:---------:|:----:|:---------:|
| **franc** | 20ms | 0.4ms | 18/21 | ✅ | ✅ |
| cld | 1.2ms | 0.08ms | 21/21 | ✅ | ❌ |
| cld3-asm | 72ms | 0.08ms | 21/21 | ❌ | ✅ |
| eld | 280ms | 0.3ms | 18/21 | ✅ | ✅ |

## 影響

1. **サーバーレス対応**: 純粋JSのためWASM/ネイティブ問題なし
2. **Turbopack対応**: ビルドが正常に完了
3. **一部言語フォールバック**: id, fa, piは検出不可のためuserLocaleを使用
4. **ISO 639-3変換**: francはISO 639-3コードを返すため変換テーブルが必要

## 実装メモ

```typescript
import { franc } from "franc";

// ISO 639-3 → ISO 639-1 変換テーブル
const iso639_3to1: Record<string, string> = {
  eng: "en",
  cmn: "zh",
  spa: "es",
  // ... 他の言語
};

const iso639_3 = franc(text);
if (iso639_3 === "und") {
  return userLocale;
}
const language = iso639_3to1[iso639_3];
return language ?? userLocale;
```

### 注意点

- francはISO 639-3（3文字）を返すため、ISO 639-1（2文字）への変換が必要
- インドネシア語・ペルシャ語・パーリ語は検出不可 → userLocaleにフォールバック
- 将来的にLLMでの言語検出も検討可能（翻訳処理と統合）
