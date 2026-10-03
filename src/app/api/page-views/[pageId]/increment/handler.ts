import { fetchPageViewCount } from "@/app/[locale]/_db/page-utility-queries.server";
import { incrementPageView as incrementPageViewMutation } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_db/mutations.server";

export async function incrementPageView(pageId: string): Promise<Response> {
	const id = Number(pageId);
	if (!Number.isFinite(id)) {
		return Response.json({ error: "invalid pageId" }, { status: 400 });
	}

	await incrementPageViewMutation(id);
	const count = await fetchPageViewCount(id);
	return Response.json({ count });
}
