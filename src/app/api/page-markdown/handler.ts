import { z } from "zod";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { readerLocale } from "../_domain/reader-locale";
import { loadPageDetail } from "../_service/load-page-detail";

const input = z.object({
	locale: readerLocale.default("en"),
	handle: z.string().min(1),
	slug: z.string().min(1),
});

export async function getPageMarkdown(request: Request) {
	const headers = PRIVATE_RESPONSE_HEADERS;
	const parsed = input.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!parsed.success) return new Response(null, { status: 400, headers });
	const { locale, handle, slug } = parsed.data;
	const data = await loadPageDetail(locale, handle, slug, request.headers);
	if (!data) return new Response(null, { status: 404, headers });
	const name =
		(data.pageDetail.title || slug)
			.trim()
			.replace(/[\\/:*?"<>|]/g, "-")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-") || "page";
	return new Response(mdastToMarkdown(data.pageDetail.mdastJson), {
		headers: {
			...headers,
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.md`,
		},
	});
}
