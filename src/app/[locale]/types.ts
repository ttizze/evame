import type { SegmentTranslation, TranslationVote } from "@prisma/client";
import type { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import type { SanitizedUser } from "../types";

export type TranslationWithUser = SegmentTranslation & {
	user: SanitizedUser;
};
export type TranslationWithInfo = TranslationWithUser & {
	currentUserVote: TranslationVote | null; // null = 未投票
};

// fetchPageDetail の戻り値から型を推論
export type PageDetail = NonNullable<
	Awaited<ReturnType<typeof fetchPageDetail>>
>;

// PageDetail から実際のセグメント型を取得
export type SegmentForDetail = PageDetail["content"]["segments"][number];
export type SegmentForList = Omit<SegmentForDetail, "annotations">;

// SegmentForDetail と SegmentForList のユニオン型
export type Segment = SegmentForDetail | SegmentForList;

export type PageForList = Omit<PageDetail, "mdastJson">;

export type PageForTitle = Omit<
	PageDetail,
	"mdastJson" | "tagPages" | "_count" | "content" | "updatedAt" | "userId"
> & {
	content: {
		segments: SegmentForList[];
	};
	_count: {
		children: number;
	};
};
