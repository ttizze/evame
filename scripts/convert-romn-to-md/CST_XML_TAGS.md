# CST XML タグ一覧とその意味

このドキュメントは、CST (Chaṭṭha Saṅgāyana Tipiṭaka) のXMLファイルで使用されているタグとその意味をまとめたものです。

## ルート要素

### `TEI.2`
- **意味**: TEI (Text Encoding Initiative) 形式のルート要素
- **説明**: XMLファイルの最上位要素。TEI.2はTEIのバージョン2を表します

## メタデータ要素

### `teiHeader`
- **意味**: TEIヘッダー
- **説明**: 文書のメタデータ（タイトル、著者、出版情報など）を含むヘッダー部分

## 構造要素

### `text`
- **意味**: テキスト本体
- **説明**: 実際のテキスト内容を含む要素

### `front`
- **意味**: 前付き
- **説明**: 本文の前に来る内容（序文、目次など）

### `body`
- **意味**: 本文
- **属性**: `xml:space="preserve"` - 空白を保持する
- **説明**: メインのテキスト内容

### `back`
- **意味**: 後付き
- **説明**: 本文の後に来る内容（索引、付録など）

## セクション要素

### `div`
- **意味**: セクション/章
- **属性**:
  - `id`: 一意の識別子（例: "dn1", "dn1_1"）
  - `n`: 番号/名前（例: "dn1", "dn1_1"）
  - `type`: セクションの種類（例: "book", "sutta"）
- **説明**: 書籍、章、経典などの階層的な構造を表す

### `head`
- **意味**: 見出し
- **属性**:
  - `rend`: レンダリングスタイル（詳細は「`rend` 属性の値」セクションを参照）
- **説明**: セクションの見出しを表す

## 段落要素

### `p`
- **意味**: 段落
- **属性**:
  - `rend`: レンダリングスタイル（詳細は「`rend` 属性の値」セクションを参照）
  - `n`: 段落番号（例: "1", "2"）
- **説明**: テキストの段落を表す。`rend`属性により見出し、偈、本文など様々な形式で表示される

## インライン要素

### `hi`
- **意味**: ハイライト/強調
- **属性**:
  - `rend`: レンダリングスタイル（詳細は「`rend` 属性の値」セクションを参照）
- **説明**: テキスト内の強調や特殊な表示を表す

## ページ参照要素

### `pb`
- **意味**: ページブレーク（Page Break）
- **属性**:
  - `ed`: 版の識別子
    - `"M"`: ミャンマー版（Myanmar edition）
    - `"V"`: VRI版（Vipassana Research Institute edition）
    - `"P"`: PTS版（Pali Text Society edition）
    - `"T"`: タイ版（Thai edition）
  - `n`: ページ番号（例: "1.0001", "1.0002"）
- **説明**: 異なる版のページ参照を表す

## 注釈要素

### `note`
- **意味**: 異読（variant reading）
- **説明**: テキストに対する異読（異なる版や写本による読み方の違い）を表す。注釈とは異なり、インラインで表示される
- **変換方法**: Markdownでは`[内容]`形式でインライン表示される（CSTと同じ形式）
- **例**: 
  - XML: `<note>ṭheto (syā. kaṃ.)</note>`
  - Markdown出力: `[ṭheto (syā. kaṃ.)]`
- **注意**: 脚注とは異なる形式で、テキスト内に直接`[内容]`として表示される

## 末尾要素

### `trailer`
- **意味**: 末尾テキスト（結語）
- **属性**:
  - `rend`: レンダリングスタイル（通常は`"centre"`）
- **説明**: セクションや経典の終わりを示す結語テキスト。通常、パーリ語で「○○が終わりました（niṭṭhitaṃ/niṭṭhitā）」という形式
- **使用例**: `<trailer rend="centre">Soṇadaṇḍasuttaṃ niṭṭhitaṃ catutthaṃ.</trailer>` → 「Soṇadaṇḍasuttaṃ（経典名）が終わりました。第4番目。」

## 使用例

```xml
<TEI.2>
<teiHeader></teiHeader>
<text>
<front></front>
<body xml:space="preserve">
  <p rend="centre">Namo tassa bhagavato arahato sammāsambuddhassa</p>
  
  <div id="dn1" n="dn1" type="book">
    <head rend="book">Sīlakkhandhavaggapāḷi</head>
    
    <div id="dn1_1" n="dn1_1" type="sutta">
      <head rend="chapter">1. Brahmajālasuttaṃ</head>
      
      <p rend="bodytext" n="1">
        <hi rend="paranum">1</hi><hi rend="dot">.</hi> Evaṃ 
        <pb ed="M" n="1.0001" /><pb ed="V" n="1.0001" />
        me sutaṃ...
      </p>
      
      <note>anubaddhā (ka. sī. pī.)</note>
      
      <trailer rend="centre">Brahmajālasuttaṃ niṭṭhitaṃ.</trailer>
    </div>
  </div>
</body>
<back></back>
</text>
</TEI.2>
```

## 属性の値の意味

### `rend` 属性の値（全リスト）

#### `p`要素で使用される`rend`値

| 値 | 意味 | 説明 |
|---|---|---|
| `centre` | 中央揃え | テキストを中央に配置 |
| `nikaya` | ニカーヤ（経典集） | 経典集のタイトル（例: "Dīghanikāyo", "Abhidhammapiṭake"） |
| `book` | 書籍 | 書籍のタイトル |
| `title` | タイトル | 作品のタイトル |
| `chapter` | 章 | 章のタイトル（`head`要素でも使用） |
| `subhead` | 小見出し | セクション内の小見出し |
| `subsubhead` | さらに小さい見出し | より細かいセクションの見出し |
| `bodytext` | 本文テキスト | 通常の本文段落 |
| `gatha1` | 偈の1行目 | 偈（詩）の最初の行。左インデント付きで表示 |
| `gatha2` | 偈の2行目 | 偈（詩）の2行目。左インデント付きで表示 |
| `gatha3` | 偈の3行目 | 偈（詩）の3行目。左インデント付きで表示 |
| `gathalast` | 偈の最終行 | 偈（詩）の最後の行。左インデント付きで表示、後に余白あり |
| `indent` | インデント | 段落全体が右にインデントされる（通常のインデント） |
| `unindented` | インデントなし | インデントなしで表示される段落（通常の本文段落とは異なり、インデントが適用されない） |
| `hangnum` | ハンギング番号 | 番号だけが独立した行で左側に表示され、その後に別の段落が続く形式（ハンギングインデント） |

#### 表示上の違いとMarkdown表現

**`indent`の例:**
```xml
<p rend="indent"><hi rend="bold">Tatrāyaṃ mātikā</hi> –</p>
```
表示:
```
    Tatrāyaṃ mātikā –
```
→ 段落全体が右にインデントされる

#### Markdownでの表現方法

**`indent`をMarkdownで表現する場合:**

**1. HTMLの`<p>`タグでスタイリング（推奨）**
```html
<p style="padding-left: 2em;">**Tatrāyaṃ mātikā** –</p>
```
→ または`class`を使用してCSSで制御

**`centre`の例:**
```xml
<p rend="centre">Namo tassa bhagavato arahato sammāsambuddhassa</p>
```
表示:
```
        Namo tassa bhagavato arahato sammāsambuddhassa
```
→ テキストが中央揃えで表示される

#### Markdownでの表現方法

**`centre`をMarkdownで表現する場合:**

**1. HTMLの`<p>`タグで中央揃え（推奨）**
```html
<p style="text-align: center;">Namo tassa bhagavato arahato sammāsambuddhassa</p>
```
→ Markdownでは中央揃えを直接サポートしていないため、HTMLを使用する必要がある

**`gatha`（偈）の例:**
```xml
<p rend="gatha1">Karuṇā viya sattesu, paññā yassa mahesino;</p>
<p rend="gathalast">Ñeyyadhammesu sabbesu, pavattittha yathāruci.</p>
```
表示:
```
        Karuṇā viya sattesu, paññā yassa mahesino;
        Ñeyyadhammesu sabbesu, pavattittha yathāruci.
```
→ 偈（詩）は左インデント付きで表示され、行間が詰められる（最後の行の後に余白あり）

#### Markdownでの表現方法

**`gatha`（偈）をMarkdownで表現する場合:**

**1. HTMLの`<p>`タグでクラス指定（推奨）**
```html
<p class="gatha1" style="margin-left: 4em; margin-bottom: 0em;">Karuṇā viya sattesu, paññā yassa mahesino;</p>
<p class="gathalast" style="margin-left: 4em; margin-bottom: 0.5em;">Ñeyyadhammesu sabbesu, pavattittha yathāruci.</p>
```
→ 左インデント（4em）と行間調整（最後の行以外は0em）で詩的な表示を実現


**`hangnum`の例:**
```xml
<p rend="hangnum" n="1"><hi rend="paranum">1</hi><hi rend="dot">.</hi></p>
<p rend="gatha1"> Maggattaye anikkhittasikkho santhatasanthate;</p>
<p rend="gathalast">Allokāse nimittaṃ saṃ, tilamattampi santhataṃ.</p>
```
表示:
```
1.
    Maggattaye anikkhittasikkho santhatasanthate;
    Allokāse nimittaṃ saṃ, tilamattampi santhataṃ.
```
→ **番号だけの独立した段落**で、その後に**改行されて複数の段落**（通常は`gatha1`, `gathalast`など）が続く（ハンギングインデント形式）
→ `hangnum`は番号だけを含む`<p>`要素で、その直後に別の`<p>`要素が続くため、**必ず改行される**

#### Markdownの番号付きリストとの違い

**Markdownの番号付きリスト（`1.`）:**
```markdown
1. 最初のアイテム
2. 二番目のアイテム
3. 三番目のアイテム
```
→ 番号と内容が**同じ行**にある。連続する番号付きリストは1つのリストとして扱われる

**`hangnum`（ハンギングインデント）:**
```
1.
    内容の段落1
    内容の段落2
2.
    次の内容の段落1
```
→ 番号だけの**独立した行**で、その下に**複数の段落**が続く。番号が左側に「ぶら下がって」表示される

**違い**: `hangnum`は番号と内容が**別々の段落**で、内容が複数行になることがある。Markdownの番号付きリストは番号と内容が**同じ行**で、各アイテムは1行。

#### Markdownでの表現方法

ハンギングインデント形式をMarkdownで表現する場合：

**1. HTMLの定義リスト（`<dl>`）を使用（推奨）**
```html
<dl>
<dt>1.</dt>
<dd>Maggattaye anikkhittasikkho santhatasanthate;<br>Allokāse nimittaṃ saṃ, tilamattampi santhataṃ.</dd>
</dl>
```
→ `<dt>`が番号、`<dd>`が内容を表し、CSSでハンギングインデントを実現可能。複数行の内容も`<br>`で表現

#### `head`要素で使用される`rend`値

| 値 | 意味 | 説明 |
|---|---|---|
| `book` | 書籍 | 書籍の見出し |
| `chapter` | 章 | 章の見出し |
| `subhead` | 小見出し | 小見出し |

#### `hi`要素で使用される`rend`値

| 値 | 意味 | 説明 |
|---|---|---|
| `bold` | 太字 | 太字で表示 |
| `italics` / `italic` | 斜体 | 斜体で表示 |
| `paranum` | 段落番号 | 段落番号（数字） |
| `dot` | ドット | ピリオド（.） |

#### `trailer`要素で使用される`rend`値

| 値 | 意味 | 説明 |
|---|---|---|
| `centre` | 中央揃え | 末尾テキストを中央に配置 |

### `type` 属性の値（`div`要素）

| 値 | 意味 |
|---|---|
| `book` | 書籍 |
| `sutta` | 経典（スッタ） |

### `ed` 属性の値（`pb`要素）

| 値 | 意味 |
|---|---|
| `M` | ミャンマー版（Myanmar edition） |
| `V` | VRI版（Vipassana Research Institute edition） |
| `P` | PTS版（Pali Text Society edition） |
| `T` | タイ版（Thai edition） |

## 参考

- TEI (Text Encoding Initiative) ガイドライン
- CST (Chaṭṭha Saṅgāyana Tipiṭaka) プロジェクト

