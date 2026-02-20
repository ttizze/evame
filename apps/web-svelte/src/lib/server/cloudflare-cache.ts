export async function purgeCacheTags(tags: string[]): Promise<void> {
	if (tags.length === 0) return;

	const zoneId = process.env.CLOUDFLARE_ZONE_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;
	if (!zoneId || !apiToken) return;

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ tags }),
		},
	);

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Cloudflare purge failed: ${response.status} ${body}`);
	}
}
