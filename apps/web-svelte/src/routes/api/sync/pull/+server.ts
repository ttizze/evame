import { json, type RequestHandler } from "@sveltejs/kit";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { findTitleSegmentText } from "@/app/api/sync/_db/queries";
import { computeRevision } from "@/app/api/sync/_domain/compute-revision";
import { authenticateToken } from "@/app/api/sync/_service/authenticate-token";
import { listActivePagesForSync } from "@/app/api/sync/pull/_db/queries";
import type { JsonValue } from "@/db/types";

export const GET: RequestHandler = async ({ request }) => {
	const auth = await authenticateToken(request);
	if (!auth) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const pages = await listActivePagesForSync(auth.userId);

	const result = await Promise.all(
		pages.map(async (page) => {
			const title = (await findTitleSegmentText(page.id)) ?? "";
			const body = mdastToMarkdown(page.mdastJson as JsonValue);
			const publishedAt = page.publishedAt ? new Date(page.publishedAt) : null;
			const revision = computeRevision({
				slug: page.slug,
				title,
				body,
				publishedAt,
			});

			return {
				slug: page.slug,
				revision,
				title,
				body,
				published_at: publishedAt ? publishedAt.toISOString() : null,
			};
		}),
	);

	return json({ pages: result });
};
