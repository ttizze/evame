import type { UserAITranslationInfo } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useHydrated } from "remix-utils/use-hydrated";
import { LocaleLink } from "~/components/LocaleLink";
import { TagList } from "~/components/TagList";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type {
	PageSegmentWithTranslations,
	PageWithTranslations,
} from "../types";
import { MemoizedParsedContent } from "./ParsedContent";
import { PageSegmentAndTranslationSection } from "./sourceTextAndTranslationSection/PageSegmentAndTranslationSection";
import { TranslateActionSection } from "./translateButton/TranslateActionSection";

interface ContentWithTranslationsProps {
	pageWithTranslations: PageWithTranslations;
	pageSegmentWithTranslations: PageSegmentWithTranslations | null;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	locale: string;
	existLocales: string[];
	showOriginal: boolean;
	showTranslation: boolean;
}

export function ContentWithTranslations({
	pageWithTranslations,
	pageSegmentWithTranslations,
	currentHandle,
	hasGeminiApiKey,
	userAITranslationInfo,
	locale,
	existLocales,
	showOriginal = true,
	showTranslation = true,
}: ContentWithTranslationsProps) {
	const isHydrated = useHydrated();

	return (
		<>
			<h1 className="!mb-0 ">
				{pageSegmentWithTranslations && (
					<PageSegmentAndTranslationSection
						pageSegmentWithTranslations={pageSegmentWithTranslations}
						showLockIcon={pageWithTranslations.page.status === "DRAFT"}
						elements={pageSegmentWithTranslations.pageSegment.text}
						showOriginal={showOriginal}
						showTranslation={showTranslation}
						currentHandle={currentHandle}
						isOwner={pageWithTranslations.user.handle === currentHandle}
						slug={pageWithTranslations.page.slug}
					/>
				)}
			</h1>
			<TagList
				tag={pageWithTranslations.tagPages.map((tagPage) => tagPage.tag)}
			/>

			<div className="flex items-center not-prose">
				<LocaleLink
					to={`/user/${pageWithTranslations.user.handle}`}
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
				</LocaleLink>
			</div>
			<TranslateActionSection
				pageId={pageWithTranslations.page.id}
				userAITranslationInfo={userAITranslationInfo}
				hasGeminiApiKey={hasGeminiApiKey}
				pageLocale={pageWithTranslations.page.sourceLanguage}
				locale={locale}
				existLocales={existLocales}
				className="pt-3"
				intent="translatePage"
			/>
			{!isHydrated ? (
				<div className="w-full h-full flex items-center justify-center">
					<Loader2 className="w-10 h-10 animate-spin" />
				</div>
			) : (
				<MemoizedParsedContent
					pageWithTranslations={pageWithTranslations}
					currentHandle={currentHandle}
					showOriginal={showOriginal}
					showTranslation={showTranslation}
					locale={locale}
				/>
			)}
		</>
	);
}
