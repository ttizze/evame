import {
	ADD_TRANSLATION_FORM_TARGET,
	TranslateTarget,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { TagList } from "@/app/[locale]/components/tag-list";
import { NavigationLink } from "@/components/navigation-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserAITranslationInfo } from "@prisma/client";
import { TranslateActionSection } from "../../../../../../components/translate-action-section";
import type { PageWithTranslations } from "../types";
import { MemoizedParsedContent } from "./parsed-content";
import { SegmentAndTranslationSection } from "./segment-and-translation-section";

interface ContentWithTranslationsProps {
	pageWithTranslations: PageWithTranslations;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	locale: string;
}

export function ContentWithTranslations({
	pageWithTranslations,
	currentHandle,
	hasGeminiApiKey,
	userAITranslationInfo,
	locale,
}: ContentWithTranslationsProps) {
	const pageSegmentTitleWithTranslations =
		pageWithTranslations.segmentWithTranslations.filter(
			(item) => item.segment?.number === 0,
		)[0];

	return (
		<>
			<h1 className="!mb-0 ">
				{pageSegmentTitleWithTranslations && (
					<SegmentAndTranslationSection
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
			<TranslateActionSection
				pageId={pageWithTranslations.page.id}
				currentHandle={currentHandle}
				userAITranslationInfo={userAITranslationInfo}
				hasGeminiApiKey={hasGeminiApiKey}
				sourceLocale={pageWithTranslations.page.sourceLocale}
				targetLocale={locale}
				existLocales={pageWithTranslations.existLocales}
				className="pt-3"
				translateTarget={TranslateTarget.TRANSLATE_PAGE}
				showAddNew={true}
			/>
			<MemoizedParsedContent
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
