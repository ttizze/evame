import { querySocialProofStats } from "../_db/queries";

export async function loadSocialProofStats(): Promise<
	Awaited<ReturnType<typeof querySocialProofStats>>
> {
	const cache =
		typeof caches === "undefined"
			? null
			: await caches.open("social-proof-stats-v1").catch(() => null);
	const key = new Request("https://evame.tech/_cache/social-proof-stats/v1");
	const cached = cache
		? await cache
				.match(key)
				.then((response) => response?.json())
				.catch(() => null)
		: null;
	if (cached) return cached;
	const stats = await querySocialProofStats();
	await cache
		?.put(
			key,
			Response.json(stats, {
				headers: { "Cache-Control": "public, max-age=30" },
			}),
		)
		.catch(() => {});
	return stats;
}
