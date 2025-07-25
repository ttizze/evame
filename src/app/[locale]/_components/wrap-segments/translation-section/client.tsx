"use client";

import {
	createElement,
	Fragment,
	type JSX,
	type MouseEvent,
	useState,
} from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_lib/sanitize-and-parse-text.client";
import type { SegmentBundle } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { AddAndVoteTranslations } from "./add-and-vote-translations";
import { VoteButtons } from "./vote-buttons/client";

interface TranslationSectionProps<Tag extends keyof JSX.IntrinsicElements> {
	bundle: SegmentBundle;
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
	currentHandle: string | undefined;
	interactive: boolean;
}

// Renders: [<Tag>translated text button</Tag>, interactive UI siblings]
export function TranslationSection<Tag extends keyof JSX.IntrinsicElements>({
	bundle,
	tagName,
	tagProps,
	currentHandle,
	interactive,
}: TranslationSectionProps<Tag>) {
	const [isSelected, setIsSelected] = useState(false);
	const { best, parentType } = bundle;
	if (!best) return null;

	const bestText = sanitizeAndParseText(best.text);

	// Text wrapped inside original semantic tag (p, h1, etc.)
	const translationText = (
		<button
			className="notranslate inline-block py-2 text-gray-700 dark:text-gray-200 text-left"
			onMouseUp={(e: MouseEvent) => {
				if (window.getSelection()?.toString()) return;
				if (e.button === 2) return;
				setIsSelected((prev) => !prev);
			}}
			type="button"
		>
			{bestText}
		</button>
	);

	const translationEl = createElement(
		tagName,
		{
			...tagProps,
			"data-number-id": bundle.segment.number,
			key: `tr-${bundle.segment.id}`,
		},
		translationText,
	);

	return (
		<Fragment>
			{translationEl}
			{isSelected && interactive && (
				<>
					<span className="flex items-center justify-end gap-2">
						<Link className="no-underline!" href={`/user/${best.user.handle}`}>
							<span className="text-sm text-gray-500 text-right flex items-center">
								by: {best.user.name}
							</span>
						</Link>
						<VoteButtons
							key={`${best.id}-${best.point}-${best.currentUserVote?.isUpvote ?? "null"}`}
							targetContentType={parentType}
							translation={best}
						/>
					</span>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						open={isSelected}
						segmentBundle={bundle}
					/>
				</>
			)}
		</Fragment>
	);
}
