# 注釈表示ロジックの選択肢

## 現在の計画（DOM操作ベース）

**方法**: `AnnotationRenderer`がDOMを監視して注釈を挿入

**問題点**:
- DOM操作が必要（Reactの流れに沿わない）
- タイミングの問題（DOMがレンダリングされた後に実行）
- パフォーマンスの問題（useEffect + DOM監視）

---

## 選択肢1: WrapSegmentを拡張（推奨）

**方法**: `WrapSegmentClient`の中で注釈も一緒に表示

**実装**:
```typescript
// WrapSegmentClient内で
const annotations = useMemo(() => {
  if (!segment.locators) return [];
  // 同じロケーターに複数本文がある場合の処理
  // 最大ナンバーのセグメントの下に注釈を表示
}, [segment]);

return (
  <Fragment>
    {source}
    {translation}
    {showAnnotations && annotations.map(ann => (
      <WrapSegmentsComponent segment={ann} />
    ))}
  </Fragment>
);
```

**メリット**:
- Reactの流れに沿っている
- DOM操作不要
- サーバーコンポーネントからクライアントコンポーネントへの自然な流れ
- 既存の`WrapSegment`の仕組みを活用

**デメリット**:
- `WrapSegmentClient`に`PageDetail`全体を渡す必要がある（または注釈データだけ）
- 同じロケーターに複数本文がある場合の判定ロジックが必要

---

## 選択肢2: mdast/hastを修正

**方法**: mdast → hastの変換時に注釈を含む構造を作成

**実装**:
- カスタムrehypeプラグインを作成
- hastを走査して、セグメントノードの後に注釈ノードを挿入

**メリット**:
- サーバー側で完結
- React要素として自然に統合

**デメリット**:
- mdast/hastの構造を理解する必要がある
- カスタムプラグインの実装が複雑
- 注釈をどう表現するか（カスタムノードタイプ？）

---

## 選択肢3: React要素を後処理

**方法**: `mdastToReact`の結果をReact要素として走査して修正

**実装**:
```typescript
function insertAnnotations(content: ReactElement, pageDetail: PageDetail) {
  return Children.map(content, (child) => {
    if (isValidElement(child) && child.props['data-number-id']) {
      const segmentNumber = child.props['data-number-id'];
      const annotations = getAnnotationsForSegment(segmentNumber, pageDetail);
      return (
        <>
          {child}
          {annotations.map(ann => <WrapSegmentsComponent segment={ann} />)}
        </>
      );
    }
    return child;
  });
}
```

**メリット**:
- React要素として処理
- DOM操作不要

**デメリット**:
- React要素の走査が複雑
- ネストされた構造に対応する必要がある

---

## 推奨: 選択肢1（WrapSegmentを拡張）

**理由**:
1. 既存のアーキテクチャに最も適合
2. `WrapSegmentClient`は既にセグメント単位で処理している
3. 注釈もセグメントなので、同じコンポーネントで扱える
4. 実装がシンプル

**実装のポイント**:
- `WrapSegmentClient`に`pageDetail`を渡す（または注釈データだけ）
- `useQueryState`で表示/非表示を制御
- 同じロケーターに複数本文がある場合の判定は、`pageDetail.content.segments`を走査

**データの流れ**:
```
PageDetail (サーバー)
  ↓
mdastToReact (サーバー)
  - segmentsにPageDetail.content.segmentsを渡す
  ↓
WrapSegment (サーバー)
  - segmentにlocatorsが含まれている
  ↓
WrapSegmentClient (クライアント)
  - segment.locatorsから注釈を取得
  - 同じロケーターに複数本文がある場合の判定
  - 注釈を表示
```

