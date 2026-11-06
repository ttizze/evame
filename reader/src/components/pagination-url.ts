export function paginationUrl(
	pathname: string,
	search: string,
	page: number,
	hash: string,
) {
	const params = new URLSearchParams(search);
	params.set("page", String(page));
	return `${pathname}?${params}${hash}`;
}
