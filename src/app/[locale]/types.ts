import type { Page, Tag, TagPage } from "@prisma/client";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import type { SanitizedUser } from "../types";

export interface BaseSegment {
	id: number;
	number: number;
	text: string;
}

export interface BaseTranslation {
	id: number;
	locale: string;
	text: string;
	point: number;
	createdAt: Date;
	user: SanitizedUser;
	currentUserVote?: UserVote; //初期データは軽量化のためユーザーはundefined AddAndVoteComponentが開くとswrでユーザーが取得される
}

export interface UserVote {
	isUpvote: boolean;
	updatedAt: Date;
}

/** React へ渡す統一バンドル */
export interface BaseSegmentBundle extends BaseSegment {
	parentType: TargetContentType;
	parentId: number;
	segmentTranslation?: BaseTranslation;
}

type TagPageWithTag = TagPage & {
	tag: Tag;
};
export type PageDetail = Page & {
	user: SanitizedUser;
	tagPages: TagPageWithTag[];
	segmentBundles: BaseSegmentBundle[];
	_count: {
		pageComments: number;
		children?: number;
	};
};
export type PageForList = Omit<
	PageDetail,
	"updatedAt" | "userId" | "mdastJson"
>;

export type PageForTitle = Omit<
	PageDetail,
	"updatedAt" | "userId" | "mdastJson" | "tagPages" | "_count"
> & {
	_count: {
		children: number;
	};
};
