# 注釈表示ロジックの具体的な実装（サーバー側前処理版）

## アプローチ: サーバー側で前処理

`fetchPageDetail`の時点で、同じロケーターに複数本文がある場合、最大ナンバーのセグメントにだけ注釈を紐づけるようにする。

これにより、フロントエンドのロジックが大幅にシンプルになる。

---

## fetchPageDetailの修正

```typescript
// page-detail-queries.server.ts

export async function fetchPageDetail(slug: string, locale: string) {
	const page = await prisma.page.findUnique({
		where: { slug },
		select: selectPageDetailFields(locale),
	});
	if (!page) return null;

	const segmentsWithNormalizedLocators = page.content.segments.map(
		(segment) => {
			if (!segment.locators) {
				return segment;
			}

			const locators = segment.locators.map((segmentLocator) => {
				const linkedSegments = segmentLocator.locator.segments.map(
					({ segment: linkedSegment }) => linkedSegment,
				);

				return {
					...segmentLocator,
					locator: {
						...segmentLocator.locator,
						segments: pickBestTranslation(linkedSegments),
					},
				};
			});

			return {
				...segment,
				locators,
			};
		},
	);

	// その後、メインの segments に pickBestTranslation を適用
	const normalizedSegments = pickBestTranslation(
		segmentsWithNormalizedLocators,
	);

	// 注釈を最大ナンバーのセグメントにだけ紐づける
	const segmentsWithFilteredAnnotations = filterAnnotationsToMaxSegments(
		normalizedSegments,
	);

	return {
		...page,
		content: {
			segments: segmentsWithFilteredAnnotations,
		},
	};
}

/**
 * 同じロケーターに複数本文がある場合、最大ナンバーのセグメントにだけ注釈を紐づける
 */
function filterAnnotationsToMaxSegments(
	segments: SegmentForDetail[],
): SegmentForDetail[] {
	// 各ロケーターについて、最大ナンバーのセグメントを特定
	const maxSegmentNumberByLocator = new Map<string, number>();

	for (const segment of segments) {
		if (!segment.locators) continue;

		for (const segmentLocator of segment.locators) {
			const locatorValue = segmentLocator.locator.value;
			const currentMax = maxSegmentNumberByLocator.get(locatorValue) ?? -1;

			if (segment.number > currentMax) {
				maxSegmentNumberByLocator.set(locatorValue, segment.number);
			}
		}
	}

	// 各セグメントについて、最大ナンバーでない場合は注釈を削除
	return segments.map((segment) => {
		if (!segment.locators) {
			return segment;
		}

		const filteredLocators = segment.locators.filter((segmentLocator) => {
			const locatorValue = segmentLocator.locator.value;
			const maxNumber = maxSegmentNumberByLocator.get(locatorValue);

			// 最大ナンバーのセグメントの場合のみ、locatorを残す
			return maxNumber !== undefined && segment.number === maxNumber;
		});

		return {
			...segment,
			locators: filteredLocators.length > 0 ? filteredLocators : undefined,
		};
	});
}
```

---

## WrapSegmentClientの実装（シンプル版）

```typescript
// wrap-segments/client.tsx

import { useMemo } from "react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { WrapSegmentsComponent } from "../wrap-segments-component/server";

export function WrapSegmentClient<Tag extends keyof JSX.IntrinsicElements>({
	segment,
	tagName,
	tagProps,
	children,
	interactive = true,
}: BaseProps & {
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
}) {
	const { mode } = useDisplay();
	const [showAnnotations] = useQueryState(
		"showAnnotations",
		parseAsBoolean.withDefault(false),
	);

	// ... 既存のsource, translationの処理 ...

	// 注釈を取得（既に最大ナンバーのセグメントにだけ紐づいている）
	const annotations = useMemo(() => {
		if (!showAnnotations || !segment.locators) {
			return [];
		}

		// segment.locatorsには既に最大ナンバーのセグメントにだけ注釈が紐づいている
		const result: SegmentForDetail[] = [];
		for (const segmentLocator of segment.locators) {
			const annotationSegments = segmentLocator.locator.segments || [];
			result.push(...annotationSegments);
		}

		return result;
	}, [segment, showAnnotations]);

	return (
		<Fragment>
			{source}
			{translation}
			{annotations.map((annotation, index) => (
				<WrapSegmentsComponent
					key={`annotation-${annotation.id}-${index}`}
					segment={annotation}
					interactive={interactive}
				/>
			))}
		</Fragment>
	);
}
```

---

## メリット

1. **フロントエンドがシンプル**: 判定ロジックが不要
2. **パフォーマンス**: サーバー側で1回だけ計算
3. **データの整合性**: PageDetailが唯一の情報源
4. **テストしやすい**: サーバー側のロジックをテストすればOK

---

## テスト

```typescript
// page-detail-queries.server.test.ts

it("同じロケーターに複数本文がある場合、最大ナンバーのセグメントにだけ注釈が紐づく", async () => {
	const testUser = await createUser();
	const { mainPage } = await createPageWithAnnotations({
		userId: testUser.id,
		mainPageSlug: "main-page",
		mainPageSegments: [
			{ number: 0, text: "Title", textAndOccurrenceHash: "hash-0" },
			{ number: 1, text: "First paragraph", textAndOccurrenceHash: "hash-1" },
			{ number: 2, text: "Continuation", textAndOccurrenceHash: "hash-2" },
			{ number: 3, text: "More text", textAndOccurrenceHash: "hash-3" },
		],
		annotationSegments: [
			{
				number: 1,
				text: "Annotation for locator 1",
				textAndOccurrenceHash: "hash-ann-1",
				linkedToMainSegmentNumber: 1,
			},
		],
	});

	// セグメント1, 2, 3を同じロケーター"1"にリンクする
	// （factoriesを拡張するか、手動でリンクを作成）

	const result = await fetchPageDetail(mainPage.slug, "en");

	// セグメント1, 2には注釈が紐づいていない
	const segment1 = result?.content.segments.find((s) => s.number === 1);
	const segment2 = result?.content.segments.find((s) => s.number === 2);
	expect(segment1?.locators).toBeUndefined();
	expect(segment2?.locators).toBeUndefined();

	// セグメント3（最大ナンバー）にだけ注釈が紐づいている
	const segment3 = result?.content.segments.find((s) => s.number === 3);
	expect(segment3?.locators).toBeDefined();
	expect(segment3?.locators?.length).toBeGreaterThan(0);
});
```
