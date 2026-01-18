import { notFound } from "next/navigation";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { extractTocItems } from "../_domain/extract-toc-items";
import type { fetchPageContext } from "../_service/fetch-page-context";
import { mdastToReact } from "./mdast-to-react/server";
import { SubHeader } from "./sub-header/index.client";

interface ContentWithTranslationsProps {
	pageData: Awaited<ReturnType<typeof fetchPageContext>>;
}

export async function ContentWithTranslations({
	pageData,
}: ContentWithTranslationsProps) {
	if (!pageData) {
		return notFound();
	}
	const { pageDetail } = pageData;
	const tocItems = extractTocItems({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.content.segments,
	});

	const titleSegment = pageDetail.content.segments.find((s) => s.number === 0);
	if (!titleSegment) {
		return notFound();
	}
	const content = await mdastToReact({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.content.segments,
	});
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
