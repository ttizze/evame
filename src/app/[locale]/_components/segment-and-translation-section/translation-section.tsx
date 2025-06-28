"use client";
import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_lib/sanitize-and-parse-text.client";
import type { SegmentBundle } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { AddAndVoteTranslations } from "./add-and-vote-translations";
import { VoteButtons } from "./vote-buttons/client";

interface TranslationSectionProps {
	segmentBundle: SegmentBundle;
	currentHandle: string | undefined;
	interactive?: boolean;
}

export function TranslationSection({
	segmentBundle,
	currentHandle,
	interactive = true,
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
			<button
				className="notranslate inline-block py-2 text-gray-700 dark:text-gray-200 text-left"
				onMouseUp={(e) => {
					if (window.getSelection()?.toString()) return;
					if (e.button === 2) return;
					setIsSelected((prev) => !prev);
				}}
				type="button"
			>
				{sanitizedAndParsedText}
			</button>
			{isSelected && interactive && (
				<>
					<span className="flex items-center justify-end gap-2">
						<Link className="no-underline!" href={`/user/${best.user.handle}`}>
							<span className="text-sm text-gray-500 text-right flex  items-center">
								by: {best.user.name}
							</span>
						</Link>
						<VoteButtons
							key={best.id}
							targetContentType={segmentBundle.parentType}
							translation={best}
						/>
					</span>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						open={isSelected}
						segmentBundle={segmentBundle}
					/>
				</>
			)}
		</span>
	);
}
