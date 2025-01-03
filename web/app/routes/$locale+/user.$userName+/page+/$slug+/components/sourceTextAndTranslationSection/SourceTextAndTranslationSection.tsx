import { Lock } from "lucide-react";
import { SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { NavLocaleLink } from "~/components/NavLocaleLink";
import type { SourceTextWithTranslations } from "../../types";
import { TranslationSection } from "./TranslationSection";
interface SourceTextAndTranslationSectionProps {
	sourceTextWithTranslations: SourceTextWithTranslations;
	elements: string | ReactNode | ReactNode[];
	isPublished?: boolean;
	sourceTextClassName?: string;
	showOriginal: boolean;
	showTranslation: boolean;
	currentUserName: string | undefined;
	isOwner?: boolean;
	slug?: string;
}

export function SourceTextAndTranslationSection({
	sourceTextWithTranslations,
	elements,
	isPublished,
	sourceTextClassName,
	showOriginal = true,
	showTranslation = true,
	currentUserName,
	isOwner,
	slug,
}: SourceTextAndTranslationSectionProps) {
	return (
		<>
			{showOriginal && (
				<span className="flex items-center">
					<span
						className={`inline-block ${
							sourceTextWithTranslations.translationsWithVotes.length === 0 ||
							!showTranslation
								? "text-gray-700 dark:text-gray-200 [&>a]:text-gray-700 dark:[&>a]:text-gray-200"
								: "text-gray-300 dark:text-gray-600 [&>a]:text-gray-300 dark:[&>a]:text-gray-600"
						} ${sourceTextClassName}`}
					>
						{isPublished === false && <Lock className="h-6 w-6 mr-1 inline" />}
						{elements}
					</span>
					{isOwner && slug && (
						<div className="ml-auto">
							<NavLocaleLink
								to={`/user/${currentUserName}/page/${slug}/edit`}
								className={({ isPending }) =>
									isPending ? "opacity-50" : "opacity-100"
								}
							>
								<SquarePen className="w-5 h-5" />
							</NavLocaleLink>
						</div>
					)}
				</span>
			)}
			{showTranslation &&
				sourceTextWithTranslations.translationsWithVotes.length > 0 && (
					<TranslationSection
						key={`translation-${sourceTextWithTranslations.sourceText.id}`}
						sourceTextWithTranslations={sourceTextWithTranslations}
						currentUserName={currentUserName}
					/>
				)}
		</>
	);
}
