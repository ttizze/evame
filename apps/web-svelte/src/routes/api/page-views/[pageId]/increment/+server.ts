import { json, type RequestHandler } from "@sveltejs/kit";
import { incrementPageView } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_db/mutations.server";
import { db } from "@/db";

export const POST: RequestHandler = async ({ params }) => {
	const id = Number(params.pageId);
	if (!Number.isFinite(id)) {
		return json({ error: "invalid pageId" }, { status: 400 });
	}

	await incrementPageView(id);
	const row = await db
		.selectFrom("pageViews")
		.select("count")
		.where("pageId", "=", id)
		.executeTakeFirst();

	return json({ count: row?.count ?? 0 });
};
