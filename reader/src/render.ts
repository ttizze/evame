import { cf, finalize } from "@astrojs/cloudflare/fetch";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { astro, FetchState } from "astro/fetch";

export async function renderReaderRequest(
	request: Request,
	env: typeof import("cloudflare:workers").env,
	context: ExecutionContext,
	readerData: Response | null,
) {
	const state = new FetchState(request);
	if (readerData !== null) state.locals.readerData = readerData;
	const asset = await cf(state, env, context);
	if (asset) return asset;
	const response = finalize(state, await astro(state));
	response.headers.set("X-Evame-HTML", "dynamic");
	return response;
}
