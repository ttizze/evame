import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageDetail, SegmentWithSegmentType } from "@/app/[locale]/types";
import type { JsonValue } from "@/db/types";
import { extractTocItems } from "../_domain/extract-toc-items";
import { mdastToReact } from "./mdast-to-react/server";
import { SubHeader } from "./sub-header/index.client";

async function getCachedContent(
	pageId: number,
	mdast: JsonValue,
	segments: SegmentWithSegmentType[],
) {
	"use cache";
	cacheLife("max");
	cacheTag(`page:${pageId}`);

	return mdastToReact({ mdast, segments });
}

interface ContentWithTranslationsProps {
	pageDetail: PageDetail;
}

export async function ContentWithTranslations({
	pageDetail,
}: ContentWithTranslationsProps) {
	const tocItems = extractTocItems({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.segments,
	});

	const titleSegment = pageDetail.segments.find((s) => s.number === 0);
	if (!titleSegment) {
		return notFound();
	}
	const content = await getCachedContent(
		pageDetail.id,
		pageDetail.mdastJson,
		pageDetail.segments,
	);
	return (
		<>
			<h1 className="mb-0! ">
				<SegmentElement segment={titleSegment} />
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<SubHeader pageDetail={pageDetail} tocItems={tocItems} />
			<div className="js-content">{content}</div>
		</>
	);
}
