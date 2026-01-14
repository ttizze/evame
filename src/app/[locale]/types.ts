import type { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import type { Tag } from "@/db/types.helpers";

// fetchPageDetail の戻り値から型を推論
export type PageDetail = NonNullable<
	Awaited<ReturnType<typeof fetchPageDetail>>
>;

// PageDetail から実際のセグメント型を取得
export type SegmentForDetail = PageDetail["content"]["segments"][number];

export type SegmentForList = {
	id: number;
	contentId: number;
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	createdAt: Date;
	segmentTypeId: number;
	segmentTypeKey: string;
	segmentTypeLabel: string;
	translationId: number | null;
	translationText: string | null;
};

// SegmentForDetail と SegmentForList のユニオン型
type SegmentForComment = Omit<SegmentForDetail, "annotations"> & {
	annotations?: SegmentForDetail["annotations"];
};
export type Segment = SegmentForDetail | SegmentForComment | SegmentForList;

export type PageForList = {
	id: number;
	slug: string;
	createdAt: Date;
	status: PageDetail["status"];
	userHandle: string;
	userName: string;
	userImage: string;
	segments: SegmentForList[];
	tags: Pick<Tag, "id" | "name">[];
	likeCount: number;
	pageCommentsCount: number;
};

export type PageForTree = {
	id: number;
	slug: string;
	parentId: number | null;
	order: number;
	userHandle: string;
	segments: SegmentForList[];
	childrenCount: number;
};
