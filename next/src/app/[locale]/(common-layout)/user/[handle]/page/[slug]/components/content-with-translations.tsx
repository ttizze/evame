import {
	ADD_TRANSLATION_FORM_TARGET,
	TranslateTarget,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { TagList } from "@/app/[locale]/components/tag-list";
import { NavigationLink } from "@/components/navigation-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
	PageAITranslationInfo,
	UserAITranslationInfo,
} from "@prisma/client";
import dynamic from "next/dynamic";
import type { PageWithTranslations } from "../types";
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

export function ContentWithTranslations({
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

			<div className="flex items-center not-prose">
				<NavigationLink
					href={`/user/${pageWithTranslations.user.handle}`}
					className="flex items-center mr-2 !no-underline hover:text-gray-700"
				>
					<Avatar className="w-10 h-10 flex-shrink-0 mr-3 ">
						<AvatarImage
							src={pageWithTranslations.user.image}
							alt={pageWithTranslations.user.name}
						/>
						<AvatarFallback>
							{pageWithTranslations.user.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-sm">{pageWithTranslations.user.name}</span>
						<span className="text-xs text-gray-500">
							{pageWithTranslations.page.createdAt}
						</span>
					</div>
				</NavigationLink>
			</div>
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
