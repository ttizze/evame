import type {
	SegmentTranslation,
	SegmentType,
	TranslationVote,
} from "@prisma/client";
import type { SanitizedUser } from "../types";
import type { fetchPageDetail } from "./_db/page-detail-queries.server";

export type TranslationWithUser = SegmentTranslation & {
	user: SanitizedUser;
};
export type TranslationWithInfo = TranslationWithUser & {
	currentUserVote: TranslationVote | null; // null = 未投票
};

/**
 * UI 用セグメント（Content -> Segment の最小形）。
 * segmentTranslations はクエリ側で take:1 などにより最良を先頭に入れる前提。
 */
export interface SegmentTypeForUI {
	key: SegmentType["key"];
	label: SegmentType["label"];
}

// fetchPageDetail の戻り値から型を推論
export type PageDetail = NonNullable<
	Awaited<ReturnType<typeof fetchPageDetail>>
>;

// PageDetail から実際のセグメント型を取得
export type SegmentForUI = PageDetail["content"]["segments"][number];

export interface LinkedSegmentGroup {
	type: SegmentTypeForUI;
	segments: SegmentForUI[];
}

export type PageForList = Omit<PageDetail, "mdastJson">;

export type PageForTitle = Omit<
	PageDetail,
	"mdastJson" | "tagPages" | "_count" | "content" | "updatedAt" | "userId"
> & {
	content: {
		segments: Array<Omit<SegmentForUI, "locators">>;
	};
	_count: {
		children: number;
	};
};
