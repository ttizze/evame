import { notFound } from "next/navigation";
import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react/server";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import { WrapSegmentsComponent } from "@/app/[locale]/_components/wrap-segments-component/server";
import type { fetchPageContext } from "../_lib/fetch-page-context";
import { SubHeader } from "./sub-header";

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

	const pageSegmentTitleWithTranslations = pageDetail.segmentBundles.filter(
		(item) => item.number === 0,
	)[0];
	const content = await mdastToReact({
		mdast: pageDetail.mdastJson,
		bundles: pageDetail.segmentBundles,
	});
	return (
		<>
			<h1 className="mb-0! ">
				{pageSegmentTitleWithTranslations && (
					<WrapSegmentsComponent bundle={pageSegmentTitleWithTranslations} />
				)}
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<SubHeader pageDetail={pageDetail} />
			<span className="js-content">{content}</span>
		</>
	);
}
