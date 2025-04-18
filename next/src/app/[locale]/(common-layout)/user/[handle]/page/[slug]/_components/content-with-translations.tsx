import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { fetchPageContext } from "../_lib/fetch-page-context";
import { SubHeader } from "./sub-header";
const DynamicTranslateActionSection = dynamic(
	() =>
		import("@/app/[locale]/_components/translate-action-section").then(
			(mod) => mod.TranslateActionSection,
		),
	{
		loading: () => <span>Loading Translate Section...</span>,
	},
);

const DynamicMemoizedParsedContent = dynamic(
	() => import("./parsed-content").then((mod) => mod.MemoizedParsedContent),
	{
		loading: () => <span>Loading Parsed Content...</span>,
	},
);
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
	slug: string;
	locale: string;
	showOriginal: boolean;
	showTranslation: boolean;
}

export async function ContentWithTranslations({
	slug,
	locale,
	showOriginal,
	showTranslation,
}: ContentWithTranslationsProps) {
	const data = await fetchPageContext(
		slug,
		locale,
		showOriginal,
		showTranslation,
	);
	if (!data) {
		return notFound();
	}
	const {
		pageDetail,
		currentUser,
		pageTranslationJobs,
		latestUserTranslationJob,
	} = data;

	const pageSegmentTitleWithTranslations = pageDetail.segmentBundles.filter(
		(item) => item.segment.number === 0,
	)[0];
	const editablePageSlug =
		pageDetail.user.handle === currentUser?.handle
			? pageDetail.slug
			: undefined;

	return (
		<>
			<h1 className="!mb-0 ">
				{pageSegmentTitleWithTranslations && (
					<DynamicSegmentAndTranslationSection
						segmentBundle={pageSegmentTitleWithTranslations}
						showLockIcon={pageDetail.status === "DRAFT"}
						currentHandle={currentUser?.handle}
						editablePageSlug={editablePageSlug}
					/>
				)}
			</h1>
			<PageTagList tag={pageDetail.tagPages.map((tagPage) => tagPage.tag)} />
			<SubHeader pageDetail={pageDetail} />
			<DynamicTranslateActionSection
				pageId={pageDetail.id}
				currentHandle={currentUser?.handle}
				translationJobs={pageTranslationJobs}
				latestUserTranslationJob={latestUserTranslationJob}
				sourceLocale={pageDetail.sourceLocale}
				className="pt-3"
				targetContentType="page"
				showIcons={true}
			/>
			<span className="js-content">
				<DynamicMemoizedParsedContent
					html={pageDetail.content}
					segmentBundles={pageDetail.segmentBundles}
					currentHandle={currentUser?.handle}
				/>
			</span>
		</>
	);
}
