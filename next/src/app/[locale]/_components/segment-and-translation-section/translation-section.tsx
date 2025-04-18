"use client";
import { sanitizeAndParseText } from "@/app/[locale]/_lib/sanitize-and-parse-text.client";
import type { SegmentBundle } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { AddAndVoteTranslations } from "./add-and-vote-translations";
import { VoteButtons } from "./vote-buttons/client";
interface TranslationSectionProps {
	segmentBundle: SegmentBundle;
	currentHandle: string | undefined;
}

export function TranslationSection({
	segmentBundle,
	currentHandle,
}: TranslationSectionProps) {
	const [isSelected, setIsSelected] = useState(false);
	const { best } = segmentBundle;
	if (!best)
		return (
			<span className="flex items-center gap-2">
				<Plus size={24} />
				<Languages size={24} />
			</span>
		);
	const sanitizedAndParsedText = sanitizeAndParseText(best.text);
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
						<Link href={`/user/${best.user.handle}`} className="!no-underline">
							<span className="text-sm text-gray-500 text-right flex  items-center">
								by: {best.user.name}
							</span>
						</Link>
						<VoteButtons
							key={best.id}
							translation={best}
							targetContentType={segmentBundle.parentType}
						/>
					</span>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						segmentBundle={segmentBundle}
						open={isSelected}
					/>
				</>
			)}
		</span>
	);
}
