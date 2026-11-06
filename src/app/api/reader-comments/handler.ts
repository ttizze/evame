import { z } from "zod";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { readerLocale } from "../_domain/reader-locale";
import { loadPageComments } from "../_service/load-page-comments";

const input = z.object({
	pageId: z.coerce.number().int().positive(),
	locale: readerLocale.default("en"),
	page: z.coerce.number().int().positive().default(1),
});

export async function getReaderComments(request: Request) {
	const headers = PRIVATE_RESPONSE_HEADERS;
	const parsed = input.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!parsed.success) return new Response(null, { status: 400, headers });
	const { pageId, locale, page } = parsed.data;
	return Response.json(
		await loadPageComments(pageId, locale, page, request.headers),
		{ headers },
	);
}
