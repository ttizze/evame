import {
	ADD_TRANSLATION_FORM_TARGET,
	TranslateTarget,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
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
		pageWithTranslations,
		currentUser,
		pageAITranslationInfo,
		userAITranslationInfo,
	} = data;

	const pageSegmentTitleWithTranslations =
		pageWithTranslations.segmentWithTranslations.filter(
			(item) => item.segment?.number === 0,
		)[0];

	return (
		<>
			<h1 className="!mb-0 ">
				{pageSegmentTitleWithTranslations && (
					<DynamicSegmentAndTranslationSection
						segmentWithTranslations={pageSegmentTitleWithTranslations}
						showLockIcon={pageWithTranslations.status === "DRAFT"}
						currentHandle={currentUser?.handle}
						isOwner={pageWithTranslations.user.handle === currentUser?.handle}
						slug={pageWithTranslations.slug}
						voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
						addTranslationFormTarget={
							ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
						}
					/>
				)}
			</h1>
			<PageTagList
				tag={pageWithTranslations.tagPages.map((tagPage) => tagPage.tag)}
			/>
			<SubHeader pageWithTranslations={pageWithTranslations} />
			<DynamicTranslateActionSection
				pageId={pageWithTranslations.id}
				currentHandle={currentUser?.handle}
				userAITranslationInfo={userAITranslationInfo}
				sourceLocale={pageWithTranslations.sourceLocale}
				pageAITranslationInfo={pageAITranslationInfo}
				className="pt-3"
				translateTarget={TranslateTarget.TRANSLATE_PAGE}
				showIcons={true}
			/>
			<span className="js-content">
				<DynamicMemoizedParsedContent
					html={pageWithTranslations.content}
					segmentWithTranslations={pageWithTranslations.segmentWithTranslations}
					currentHandle={currentUser?.handle}
					voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
					addTranslationFormTarget={
						ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
					}
				/>
			</span>
		</>
	);
}
