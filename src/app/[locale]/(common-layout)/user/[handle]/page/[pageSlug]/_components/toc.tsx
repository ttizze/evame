"use client";
import type { TocItem } from "../_domain/extract-toc-items";

export default function TableOfContents({
	items,
	onItemClick,
}: {
	items: TocItem[];
	onItemClick: () => void;
}) {
	return (
		<nav aria-label="Table of contents" data-testid="toc">
			<ol className="min-w-[200px] space-y-2 text-sm">
				{items.map((item) => {
					const padding = getPaddingClass(item.depth);
					const hasTranslation = Boolean(item.translatedText);
					const sourceLabel = truncateLabel(item.sourceText);
					const translatedLabel = item.translatedText
						? truncateLabel(item.translatedText)
						: null;
					return (
						<li className={padding} key={item.id}>
							<a
								className={`block text-left w-full leading-snug hover:underline seg-src ${hasTranslation ? "seg-has-tr" : ""}`.trim()}
								href={`#${item.id}`}
								onClick={onItemClick}
							>
								{sourceLabel}
							</a>
							{translatedLabel ? (
								<a
									className="block text-left w-full leading-snug hover:underline seg-tr"
									href={`#${item.id}-tr`}
									onClick={onItemClick}
								>
									{translatedLabel}
								</a>
							) : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

const MAX_LABEL_LENGTH = 40;

function getPaddingClass(depth: number): string {
	if (depth <= 1) return "pl-0";
	if (depth === 2) return "pl-3";
	return "pl-6";
}

function truncateLabel(text: string): string {
	return text.length > MAX_LABEL_LENGTH
		? `${text.substring(0, MAX_LABEL_LENGTH)}...`
		: text;
}
