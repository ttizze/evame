import { use } from "react";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageDetail } from "@/app/[locale]/types";
import { extractTocItems } from "../_domain/extract-toc-items";
import { mdastToReact } from "./mdast-to-react";
import { SubHeader } from "./sub-header";

interface ContentWithTranslationsProps {
	pageDetail: PageDetail;
}

const contentPromises = new WeakMap<
	PageDetail,
	ReturnType<typeof mdastToReact>
>();

export function ContentWithTranslations({
	pageDetail,
}: ContentWithTranslationsProps) {
	const tocItems = extractTocItems({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.segments,
	});

	const titleSegment = pageDetail.segments.find(
		(segment) => segment.number === 0,
	);

	let contentPromise = contentPromises.get(pageDetail);
	if (!contentPromise) {
		contentPromise = mdastToReact({
			mdast: pageDetail.mdastJson,
			segments: pageDetail.segments,
		});
		contentPromises.set(pageDetail, contentPromise);
	}
	const content = use(contentPromise);
	const markdown = mdastToMarkdown(pageDetail.mdastJson);
	if (!titleSegment) return null;
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
