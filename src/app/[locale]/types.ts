import type { fetchPage } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_service/fetch-page.server";
import type {
	SanitizedUser,
	SegmentTranslation,
	TranslationVote,
} from "@/db/types.helpers";

export type TranslationWithUser = SegmentTranslation & {
	user: SanitizedUser;
};
export type TranslationWithInfo = TranslationWithUser & {
	currentUserVote: TranslationVote | null; // null = 未投票
};

// fetchPage の戻り値から型を推論
export type PageDetail = NonNullable<Awaited<ReturnType<typeof fetchPage>>>;

// PageDetail から実際のセグメント型を取得
export type SegmentForDetail = PageDetail["content"]["segments"][number];
export type SegmentForList = Omit<SegmentForDetail, "annotations">;

// SegmentForDetail と SegmentForList のユニオン型
export type Segment = SegmentForDetail | SegmentForList;

export type PageForList = Omit<
	PageDetail,
	"mdastJson" | "content" | "section" | "totalSections" | "hasMoreSections"
> & {
	content: {
		segments: SegmentForList[];
	};
};

export type PageForTitle = Omit<PageForList, "tagPages" | "_count"> & {
	_count: {
		children: number;
	};
};
