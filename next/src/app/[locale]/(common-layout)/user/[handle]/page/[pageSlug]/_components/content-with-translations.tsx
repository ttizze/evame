import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { fetchPageContext } from "../_lib/fetch-page-context";
import { SubHeader } from "./sub-header";
const DynamicSegmentAndTranslationSection = dynamic(
	() =>
		import(
			"@/app/[locale]/_components/segment-and-translation-section/client"
		).then((mod) => mod.SegmentAndTranslationSection),
	{
		loading: () => <span>Loading Segment And Translation Section...</span>,
	},
);

interface ContentWithTranslationsProps {
	pageData: Awaited<ReturnType<typeof fetchPageContext>>;
}

export async function ContentWithTranslations({
	pageData,
}: ContentWithTranslationsProps) {
	if (!pageData) {
		return notFound();
	}
	const {
		pageDetail,
		currentUser,
		pageTranslationJobs,
		latestUserTranslationJob,
	} = pageData;

	const pageSegmentTitleWithTranslations = pageDetail.segmentBundles.filter(
		(item) => item.segment.number === 0,
	)[0];
	const content = await mdastToReact({
		mdast: pageDetail.mdastJson,
		bundles: pageDetail.segmentBundles,
		currentHandle: currentUser?.handle,
	});
	return (
		<>
			<h1 className="mb-0! ">
				{pageSegmentTitleWithTranslations && (
					<DynamicSegmentAndTranslationSection
						segmentBundle={pageSegmentTitleWithTranslations}
						currentHandle={currentUser?.handle}
					/>
				)}
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<SubHeader
				pageDetail={pageDetail}
				currentUserHandle={currentUser?.handle}
			/>
			<span className="js-content">{content}</span>
		</>
	);
}
