import { notFound } from "next/navigation";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageDetail } from "@/app/[locale]/types";
import { extractTocItems } from "../_domain/extract-toc-items";
import { mdastToReact } from "./mdast-to-react/server";
import { SubHeader } from "./sub-header/index.client";

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
	const content = await mdastToReact({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.segments,
	});
	const markdown = mdastToMarkdown(pageDetail.mdastJson);
	return (
		<>
			<h1 className="mb-0! ">
				<SegmentElement segment={titleSegment} />
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<SubHeader
				markdown={markdown}
				pageDetail={pageDetail}
				tocItems={tocItems}
			/>
			<div className="js-content">{content}</div>
		</>
	);
}
