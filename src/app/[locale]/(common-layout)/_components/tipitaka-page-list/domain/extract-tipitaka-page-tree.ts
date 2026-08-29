import {
	isPagePubliclyReadable,
	TIPITAKA_SOURCE_LOCALE,
} from "@/app/[locale]/_domain/tipitaka-page-visibility";
import type { ContentKind, PageStatus } from "@/db/types";

export type TipitakaPageRow = {
	id: number;
	slug: string;
	parentId: number | null;
	order: number;
	publishedAt: Date | null;
	userHandle: string;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
	sourceLocale: string;
	status: PageStatus;
	contentKind: ContentKind;
};

export type TipitakaPageTreeNode = {
	id: number;
	slug: string;
	parentId: number;
	order: number;
	userHandle: string;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
	children: TipitakaPageTreeNode[];
};

/**
 * ルート配下の公開対象パーリ語 PAGE だけを、DB の親子関係と順序で木にする。
 *
 * SQL 側でも公開 PAGE を再帰的に辿るが、抽出条件をここでも明示しておく。
 * そのため、呼び出し側が別の取得元を渡した場合にも、トップに出す対象を
 * PUBLIC または公開日時がある ARCHIVE / PAGE / pi から逸脱させない。
 */
export function extractTipitakaPageTree(
	rows: readonly TipitakaPageRow[],
	rootPageId: number,
): TipitakaPageTreeNode[] {
	const eligibleRows = rows.filter(
		(row) =>
			isPagePubliclyReadable({
				isTipitakaPage: true,
				publishedAt: row.publishedAt,
				status: row.status,
			}) &&
			row.contentKind === "PAGE" &&
			row.sourceLocale === TIPITAKA_SOURCE_LOCALE,
	);
	const rowsByParent = new Map<number, TipitakaPageRow[]>();

	for (const row of eligibleRows) {
		if (row.parentId === null) continue;
		const siblings = rowsByParent.get(row.parentId) ?? [];
		siblings.push(row);
		rowsByParent.set(row.parentId, siblings);
	}

	const buildChildren = (
		parentId: number,
		ancestors: ReadonlySet<number>,
	): TipitakaPageTreeNode[] => {
		const siblings = rowsByParent.get(parentId) ?? [];
		return [...siblings]
			.sort((left, right) => left.order - right.order || left.id - right.id)
			.filter((row) => !ancestors.has(row.id))
			.map((row) => {
				const nextAncestors = new Set(ancestors);
				nextAncestors.add(row.id);
				return {
					id: row.id,
					slug: row.slug,
					parentId: row.parentId as number,
					order: row.order,
					userHandle: row.userHandle,
					titleSegmentId: row.titleSegmentId,
					titleText: row.titleText,
					titleTranslationText: row.titleTranslationText,
					children: buildChildren(row.id, nextAncestors),
				};
			});
	};

	return buildChildren(rootPageId, new Set([rootPageId]));
}

export {
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SOURCE_LOCALE,
	TIPITAKA_SYSTEM_USER_HANDLE,
} from "@/app/[locale]/_domain/tipitaka-page-visibility";
