import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ platform }) => {
	const hasAssetsBinding = Boolean(platform?.env.ASSETS);

	return json(
		{
			status: "ok",
			runtime: "sveltekit-cloudflare",
			hasAssetsBinding,
			timestamp: new Date().toISOString(),
		},
		{
			headers: {
				"cache-control": "no-store",
			},
		},
	);
};
