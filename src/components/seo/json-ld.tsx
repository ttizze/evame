import type { ReactElement } from "react";

type JsonLdObject = Record<string, unknown>;

function JsonLd({ data }: { data: JsonLdObject }): ReactElement {
	const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");
	return <script type="application/ld+json">{serialized}</script>;
}

type ArticleJsonLdProps = {
	headline: string;
	description: string;
	authorName?: string;
	authorUrl?: string;
	datePublished?: string;
	dateModified?: string;
	url: string;
	image?: string;
	inLanguage: string;
};

export function ArticleJsonLd({
	headline,
	description,
	authorName,
	authorUrl,
	datePublished,
	dateModified,
	url,
	image,
	inLanguage,
}: ArticleJsonLdProps): ReactElement {
	return (
		<JsonLd
			data={{
				"@context": "https://schema.org",
				"@type": "Article",
				headline,
				description,
				url,
				inLanguage,
				...(authorName
					? {
							author: {
								"@type": "Person",
								name: authorName,
								...(authorUrl ? { url: authorUrl } : {}),
							},
						}
					: {}),
				...(datePublished ? { datePublished } : {}),
				...(dateModified ? { dateModified } : {}),
				...(image ? { image } : {}),
			}}
		/>
	);
}

export function BreadcrumbJsonLd({
	items,
}: {
	items: Array<{ name: string; url: string }>;
}): ReactElement {
	return (
		<JsonLd
			data={{
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				itemListElement: items.map((item, index) => ({
					"@type": "ListItem",
					position: index + 1,
					name: item.name,
					item: item.url,
				})),
			}}
		/>
	);
}
