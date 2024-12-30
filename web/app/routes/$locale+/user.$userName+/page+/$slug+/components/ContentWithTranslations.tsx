import type { UserAITranslationInfo } from "@prisma/client";
import { Hash, Loader2 } from "lucide-react";
import { useHydrated } from "remix-utils/use-hydrated";
import { LocaleLink } from "~/components/LocaleLink";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type {
	PageWithTranslations,
	SourceTextWithTranslations,
} from "../types";
import { MemoizedParsedContent } from "./ParsedContent";
import { SourceTextAndTranslationSection } from "./sourceTextAndTranslationSection/SourceTextAndTranslationSection";
import { TranslateActionSection } from "./translateButton/TranslateActionSection";

interface ContentWithTranslationsProps {
	pageWithTranslations: PageWithTranslations;
	sourceTitleWithTranslations: SourceTextWithTranslations | null;
	currentUserName: string | undefined;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	locale: string;
	otherLocales: string[];
	showOriginal: boolean;
	showTranslation: boolean;
}

export function ContentWithTranslations({
	pageWithTranslations,
	sourceTitleWithTranslations,
	currentUserName,
	hasGeminiApiKey,
	userAITranslationInfo,
	locale,
	otherLocales,
	showOriginal = true,
	showTranslation = true,
}: ContentWithTranslationsProps) {
	const isHydrated = useHydrated();

	return (
		<>
			<h1 className="!mb-0 ">
				{sourceTitleWithTranslations && (
					<SourceTextAndTranslationSection
						sourceTextWithTranslations={sourceTitleWithTranslations}
						isPublished={pageWithTranslations.page.isPublished}
						elements={sourceTitleWithTranslations.sourceText.text}
						showOriginal={showOriginal}
						showTranslation={showTranslation}
						currentUserName={currentUserName}
						isOwner={pageWithTranslations.user.userName === currentUserName}
						slug={pageWithTranslations.page.slug}
					/>
				)}
			</h1>
			<div className="flex flex-wrap gap-2 pt-2 pb-3">
				{pageWithTranslations.tagPages.map((tagPage) => (
					<div
						key={tagPage.tag.id}
						className="flex items-center gap-1 px-3 h-[32px] bg-secondary rounded-full text-sm text-secondary-foreground"
					>
						<button type="button" className="hover:text-destructive ml-1">
							<Hash className="w-3 h-3" />
						</button>
						<span>{tagPage.tag.name}</span>
					</div>
				))}
			</div>

			<div className="flex items-center not-prose">
				<LocaleLink
					to={`/user/${pageWithTranslations.user.userName}`}
					className="flex items-center mr-2 !no-underline hover:text-gray-700"
				>
					<Avatar className="w-12 h-12 flex-shrink-0 mr-3 ">
						<AvatarImage
							src={pageWithTranslations.user.icon}
							alt={pageWithTranslations.user.displayName}
						/>
						<AvatarFallback>
							{pageWithTranslations.user.displayName.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-sm">
							{pageWithTranslations.user.displayName}
						</span>
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
				locale={locale}
				otherLocales={otherLocales}
			/>
			{!isHydrated ? (
				<div className="w-full h-full flex items-center justify-center">
					<Loader2 className="w-10 h-10 animate-spin" />
				</div>
			) : (
				<MemoizedParsedContent
					pageWithTranslations={pageWithTranslations}
					currentUserName={currentUserName}
					showOriginal={showOriginal}
					showTranslation={showTranslation}
					locale={locale}
				/>
			)}
		</>
	);
}
