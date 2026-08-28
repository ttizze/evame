import { buildAlternates } from "@/app/_lib/seo-helpers";

export function getProfileMetadata(
	locale: string,
	pageOwner: {
		handle: string;
		image: string;
		name: string;
		profile: string;
	},
) {
	const title = `${pageOwner.name} (@${pageOwner.handle}) | Evame`;
	const description =
		pageOwner.profile ||
		`${pageOwner.name}さんのEvameプロフィール。記事と翻訳をチェック。`;

	return {
		title,
		description,
		image: pageOwner.image || undefined,
		alternates: buildAlternates(locale, `/${pageOwner.handle}`),
	};
}
