"use client";
import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { sanitizeAndParseText } from "@/app/[locale]/_lib/sanitize-and-parse-text.client";
import type { SegmentWithTranslations } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { AddAndVoteTranslations } from "./add-and-vote-translations";
import { VoteButtons } from "./vote-buttons/client";

interface TranslationSectionProps {
	segmentWithTranslations: SegmentWithTranslations;
	currentHandle: string | undefined;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export function TranslationSection({
	segmentWithTranslations,
	currentHandle,
	voteTarget,
	addTranslationFormTarget,
}: TranslationSectionProps) {
	const [isSelected, setIsSelected] = useState(false);

	const { bestSegmentTranslationWithVote } = segmentWithTranslations;
	if (!bestSegmentTranslationWithVote)
		return (
			<span className="flex items-center gap-2">
				<Plus size={24} />
				<Languages size={24} />
			</span>
		);
	const sanitizedAndParsedText = sanitizeAndParseText(
		bestSegmentTranslationWithVote.text,
	);
	return (
		<span className={"group relative"}>
			<span
				className="notranslate inline-block py-2 text-gray-700 dark:text-gray-200"
				onMouseUp={(e) => {
					if (window.getSelection()?.toString()) return;
					if (e.button === 2) return;
					setIsSelected((prev) => !prev);
				}}
			>
				{sanitizedAndParsedText}
			</span>
			{isSelected && (
				<>
					<span className="flex items-center justify-end gap-2">
						<Link
							href={`/user/${bestSegmentTranslationWithVote?.user.handle}`}
							className="!no-underline"
						>
							<span className="text-sm text-gray-500 text-right flex  items-center">
								by: {bestSegmentTranslationWithVote?.user.name}
							</span>
						</Link>
						<VoteButtons
							key={bestSegmentTranslationWithVote.id}
							translationWithVote={bestSegmentTranslationWithVote}
							voteTarget={voteTarget}
						/>
					</span>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						segmentWithTranslations={segmentWithTranslations}
						open={isSelected}
						voteTarget={voteTarget}
						addTranslationFormTarget={addTranslationFormTarget}
					/>
				</>
			)}
		</span>
	);
}
