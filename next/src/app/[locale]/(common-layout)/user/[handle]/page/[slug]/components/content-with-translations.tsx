import {
	ADD_TRANSLATION_FORM_TARGET,
	TranslateTarget,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { TagList } from "@/app/[locale]/components/tag-list";
import type { PageWithTranslations } from "@/app/[locale]/types";
import type {
	PageAITranslationInfo,
	UserAITranslationInfo,
} from "@prisma/client";

import dynamic from "next/dynamic";
import { SubHeader } from "./sub-header";
const DynamicTranslateActionSection = dynamic(
	() =>
		import("@/app/[locale]/components/translate-action-section").then(
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
		import("./segment-and-translation-section").then(
			(mod) => mod.SegmentAndTranslationSection,
		),
	{
		loading: () => <span>Loading Segment And Translation Section...</span>,
	},
);

interface ContentWithTranslationsProps {
	pageWithTranslations: PageWithTranslations;
	currentHandle: string | undefined;
	userAITranslationInfo: UserAITranslationInfo | null;
	pageAITranslationInfo: PageAITranslationInfo[];
}

export async function ContentWithTranslations({
	pageWithTranslations,
	currentHandle,
	userAITranslationInfo,
	pageAITranslationInfo,
}: ContentWithTranslationsProps) {
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
						showLockIcon={pageWithTranslations.page.status === "DRAFT"}
						elements={pageSegmentTitleWithTranslations?.segment.text}
						currentHandle={currentHandle}
						isOwner={pageWithTranslations.user.handle === currentHandle}
						slug={pageWithTranslations.page.slug}
						voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
						addTranslationFormTarget={
							ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
						}
					/>
				)}
			</h1>
			<TagList
				tag={pageWithTranslations.tagPages.map((tagPage) => tagPage.tag)}
			/>
			<SubHeader pageWithTranslations={pageWithTranslations} />
			<DynamicTranslateActionSection
				pageId={pageWithTranslations.page.id}
				currentHandle={currentHandle}
				userAITranslationInfo={userAITranslationInfo}
				sourceLocale={pageWithTranslations.page.sourceLocale}
				pageAITranslationInfo={pageAITranslationInfo}
				className="pt-3"
				translateTarget={TranslateTarget.TRANSLATE_PAGE}
				showIcons={true}
			/>
			<DynamicMemoizedParsedContent
				html={pageWithTranslations.page.content}
				segmentWithTranslations={pageWithTranslations.segmentWithTranslations}
				currentHandle={currentHandle}
				voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
				addTranslationFormTarget={
					ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
				}
			/>
		</>
	);
}
