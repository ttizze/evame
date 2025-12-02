/**
 * スラグを人間が読みやすい形式に変換する
 * 例: "some-slug" → "Some Slug"
 */
export function beautifySlug(slug: string): string {
	return slug
		.replace(/-/g, " ")
		.replace(/\s+/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.trim();
}
