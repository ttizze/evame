/** 単独のX/Twitter投稿URLを検証し、埋め込みに使う投稿IDを返す。 */
export function getXPostId(url: string): string | null {
	return (
		/^https?:\/\/(?:(?:www|mobile)\.)?(?:x\.com|twitter\.com)\/(?:[^/]+\/status(?:es)?|i\/web\/status)\/(\d+)(?:[/?#]\S*)?$/i.exec(
			url,
		)?.[1] ?? null
	);
}
