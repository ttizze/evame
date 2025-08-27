import type {
	Page,
	SegmentTranslation,
	Tag,
	TagPage,
	TranslationVote,
} from "@prisma/client";
import type { SanitizedUser } from "../types";

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
export interface SegmentForUI {
	id: number;
	number: number;
	text: string;
	segmentTranslation: TranslationWithUser | null;
}

type TagPageWithTag = TagPage & {
	tag: Tag;
};
export type PageDetail = Omit<Page, "updatedAt" | "userId"> & {
	user: SanitizedUser;
	tagPages: TagPageWithTag[];
	content: {
		segments: SegmentForUI[];
	};
	_count: {
		pageComments: number;
		children: number | null;
	};
};

export type PageForList = Omit<PageDetail, "mdastJson">;

export type PageForTitle = Omit<
	PageDetail,
	"mdastJson" | "tagPages" | "_count"
> & {
	_count: {
		children: number;
	};
};
