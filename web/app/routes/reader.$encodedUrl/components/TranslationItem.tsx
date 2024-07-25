import { sanitizeAndParseText } from "../functions/sanitize-and-parse-text";
import type { TranslationWithVote } from "../types";
import { VoteButtons } from "./VoteButtons";

interface TranslationItemProps {
	translation: TranslationWithVote;
	userId: number | null;
	showAuthor?: boolean;
}

export function TranslationItem({
	translation,
	userId,
	showAuthor = false,
}: TranslationItemProps) {
	return (
		<div className="p-2 rounded-xl border">
			<div className="font-medium mb-2">
				{sanitizeAndParseText(translation.text)}
			</div>
			{showAuthor && (
				<p className="text-sm text-gray-500 text-right">
					Translated by: {translation.userName}
				</p>
			)}
			<VoteButtons translationWithVote={translation} userId={userId} />
		</div>
	);
}
