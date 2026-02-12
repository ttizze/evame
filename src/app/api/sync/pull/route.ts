import { NextResponse } from "next/server";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import type { JsonValue } from "@/db/types";
import { findTitleSegmentText } from "../_db/queries";
import { computeRevision } from "../_domain/compute-revision";
import { authenticateToken } from "../_service/authenticate-token";
import { listActivePagesForSync } from "./_db/queries";

export async function GET(request: Request) {
	const auth = await authenticateToken(request);
	if (!auth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

	return NextResponse.json({ pages: result });
}
