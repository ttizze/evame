import type { Page, Tag, TagPage } from "@prisma/client";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import type { SanitizedUser } from "../types";

interface BaseSegment {
	id: number;
	number: number;
	text: string;
}

export interface BaseTranslation {
	id: number;
	locale: string;
	text: string;
	point: number;
	createdAt: string; // ISO 文字列
	user: SanitizedUser;
	currentUserVote: UserVote | null;
}

interface UserVote {
	isUpvote: boolean;
	updatedAt: string; // ISO 文字列
}

/** React へ渡す統一バンドル */
export interface SegmentBundle {
	parentType: TargetContentType;
	parentId: number;
	segment: BaseSegment;
	translations: BaseTranslation[];
	best: BaseTranslation | null;
}

type TagPageWithTag = TagPage & {
	tag: Tag;
};
export type PageDetail = Omit<Page, "createdAt"> & {
	createdAt: string;
	user: SanitizedUser;
	tagPages: TagPageWithTag[];
	segmentBundles: SegmentBundle[];
	_count: {
		pageComments: number;
		children?: number;
	};
	children?: PageSummary[];
};
export type PageSummary = Omit<
	PageDetail,
	"updatedAt" | "userId" | "mdastJson"
>;
