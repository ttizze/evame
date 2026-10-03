import type { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import type { PageStatus } from "@/db/types";
import type { Tag } from "@/db/types.helpers";

// fetchPageDetail の戻り値から型を推論
export type PageDetail = NonNullable<
	Awaited<ReturnType<typeof fetchPageDetail>>
>;

export type Segment = {
	id: number;
	contentId: number;
	number: number;
	text: string;
	translationText: string | null;
};

export type PageForList = {
	id: number;
	slug: string;
	createdAt: Date;
	status: PageStatus;
	userHandle: string;
	userName: string;
	userImage: string;
	titleSegment: Segment;
	tags: Pick<Tag, "id" | "name">[];
	likeCount: number;
	pageCommentsCount: number;
	viewCount: number;
};

export type PageForTree = {
	id: number;
	slug: string;
	parentId: number | null;
	order: number;
	userHandle: string;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
};
