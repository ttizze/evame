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
import { AddAndVoteTranslations } from "./add-and-vote-translations.client";

interface TranslationSectionProps<Tag extends keyof JSX.IntrinsicElements> {
	bundle: SegmentBundle;
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
	interactive: boolean;
}

// Renders: [<Tag>translated text button</Tag>, interactive UI siblings]
export function TranslationSection<Tag extends keyof JSX.IntrinsicElements>({
	bundle,
	tagName,
	tagProps,
	interactive,
}: TranslationSectionProps<Tag>) {
	const [isSelected, setIsSelected] = useState(false);
	const { segmentTranslation, parentType } = bundle;

	if (!segmentTranslation) return null;

	const bestText = sanitizeAndParseText(segmentTranslation.text);

	// Text wrapped inside original semantic tag (p, h1, etc.)
	const translationText = (
		<button
			className="inline-block py-2 text-gray-700 dark:text-gray-200 text-left cursor-pointer select-text"
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
			"data-number-id": bundle.number,
			key: `tr-${bundle.id}`,
		},
		translationText,
	);

	return (
		<Fragment>
			{translationEl}
			{isSelected && interactive && (
				<AddAndVoteTranslations
					bestTranslation={segmentTranslation}
					open={isSelected}
					segmentId={bundle.id}
					targetContentType={parentType}
				/>
			)}
		</Fragment>
	);
}
