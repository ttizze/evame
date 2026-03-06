import { notFound } from "next/navigation";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageDetail } from "@/app/[locale]/types";
import { mdastToReact } from "./mdast-to-react/server";

interface ContentWithTranslationsProps {
	pageDetail: PageDetail;
}

export async function ContentWithTranslations({
	pageDetail,
}: ContentWithTranslationsProps) {
	const titleSegment = pageDetail.segments.find((s) => s.number === 0);
	if (!titleSegment) {
		return notFound();
	}
	const content = await mdastToReact({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.segments,
	});
	return (
		<>
			<h1 className="mb-0! ">
				<SegmentElement segment={titleSegment} />
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<div className="js-content">{content}</div>
		</>
	);
}
