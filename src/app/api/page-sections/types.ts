import type { SegmentForRender } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment-for-render";
import type { JsonValue } from "@/db/types";

export type PageSectionsOkResponse = {
	mdastJson: JsonValue;
	segments: SegmentForRender[];
	section: number;
	hasMore: boolean;
	totalSections: number;
};

export type PageSectionsResponse = PageSectionsOkResponse | { error: string };
