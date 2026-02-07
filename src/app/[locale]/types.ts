import type { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import type { PageStatus } from "@/db/types";
import type { Tag } from "@/db/types.helpers";

// fetchPageDetail の戻り値から型を推論
export type PageDetail = NonNullable<
	Awaited<ReturnType<typeof fetchPageDetail>>
>;

export type SegmentWithSegmentType = {
	id: number;
	contentId: number;
	number: number;
	text: string;
	translationText: string | null;
	segmentTypeKey: string;
	segmentTypeLabel: string;
};
export type TitleSegment = Omit<
	SegmentWithSegmentType,
	"segmentTypeKey" | "segmentTypeLabel"
>;

export type SegmentForDetail = SegmentWithSegmentType & {
	annotations: Array<{
		annotationSegment: SegmentWithSegmentType;
	}>;
};

// SegmentForDetail と TitleSegment のユニオン型
type SegmentForComment = Omit<SegmentForDetail, "annotations"> & {
	annotations?: SegmentForDetail["annotations"];
};
export type Segment = SegmentForDetail | SegmentForComment | TitleSegment;

export type PageForList = {
	id: number;
	slug: string;
	createdAt: Date;
	status: PageStatus;
	userHandle: string;
	userName: string;
	userImage: string;
	titleSegment: TitleSegment;
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
