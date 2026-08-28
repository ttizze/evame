import { buildAlternates } from "@/app/_lib/seo-helpers";

export function getTagMetadata(locale: string, tagName: string) {
	const decodedTagName = decodeURIComponent(tagName);
	const title = `${decodedTagName} | Evame`;
	const description = `Browse the latest articles tagged with "${decodedTagName}" on Evame. Discover multilingual content from writers worldwide.`;

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, `/tag/${tagName}`),
	};
}
