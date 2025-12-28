import { notFound } from "next/navigation";
import { mdastToReact } from "@/app/[locale]/(common-layout)/_components/mdast-to-react/server";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { fetchPageContext } from "../_lib/fetch-page-context";
import { SectionLoader } from "./section-loader/client";
import { SubHeader } from "./sub-header";
import { TranslationFormOnClick } from "./translation-form-on-click.client";

interface ContentWithTranslationsProps {
	pageData: Awaited<ReturnType<typeof fetchPageContext>>;
	locale: string;
}

export async function ContentWithTranslations({
	pageData,
	locale,
}: ContentWithTranslationsProps) {
	if (!pageData) {
		return notFound();
	}
	const { pageDetail } = pageData;

	const titleSegment = pageDetail.content.segments.find((s) => s.number === 0);
	const content = await mdastToReact({
		mdast: pageDetail.mdastJson,
		segments: pageDetail.content.segments,
	});
	return (
		<>
			<h1 className="mb-0! ">
				{titleSegment ? <SegmentElement segment={titleSegment} /> : null}
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<SubHeader pageDetail={pageDetail} />
			<div className="js-content">
				{content}
				<SectionLoader
					locale={locale}
					slug={pageDetail.slug}
					startSection={(pageDetail.section ?? 0) + 1}
					totalSections={pageDetail.totalSections ?? 1}
				/>
			</div>
			<TranslationFormOnClick />
		</>
	);
}
