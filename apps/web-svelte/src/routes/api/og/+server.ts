import type { RequestHandler } from "@sveltejs/kit";
import { db } from "@/db";

const OG_CACHE_CONTROL =
	"public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const OG_NOT_FOUND_CACHE_CONTROL =
	"public, max-age=0, s-maxage=60, stale-while-revalidate=600";

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function renderSvg(params: {
	title: string;
	userName: string;
	userHandle: string;
}): string {
	const title = escapeXml(params.title || "Untitled");
	const userName = escapeXml(params.userName || "Unknown");
	const userHandle = escapeXml(params.userHandle || "unknown");

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect width="1200" height="630" fill="#0B1220"/>
	<rect x="36" y="36" width="1128" height="558" rx="20" fill="#F8FAFC"/>
	<text x="84" y="126" fill="#334155" font-size="38" font-family="sans-serif">@${userHandle}</text>
	<text x="84" y="188" fill="#0F172A" font-size="54" font-family="sans-serif">${userName}</text>
	<text x="84" y="318" fill="#111827" font-size="64" font-family="sans-serif">${title}</text>
	<text x="84" y="560" fill="#64748B" font-size="30" font-family="sans-serif">evame.tech</text>
</svg>`;
}

export const GET: RequestHandler = async ({ url }) => {
	const slug = url.searchParams.get("slug") || "";
	if (!slug) {
		return new Response(
			renderSvg({ title: "Page Not Found", userName: "", userHandle: "" }),
			{
				headers: {
					"content-type": "image/svg+xml; charset=utf-8",
					"cache-control": OG_NOT_FOUND_CACHE_CONTROL,
				},
				status: 404,
			},
		);
	}

	const page = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.id",
			"pages.slug",
			"users.name as userName",
			"users.handle as userHandle",
		])
		.where("pages.slug", "=", slug)
		.executeTakeFirst();

	if (!page) {
		return new Response(
			renderSvg({ title: "Page Not Found", userName: "", userHandle: "" }),
			{
				headers: {
					"content-type": "image/svg+xml; charset=utf-8",
					"cache-control": OG_NOT_FOUND_CACHE_CONTROL,
				},
				status: 404,
			},
		);
	}

	const titleSegment = await db
		.selectFrom("segments")
		.select("text")
		.where("contentId", "=", page.id)
		.where("number", "=", 0)
		.executeTakeFirst();

	const svg = renderSvg({
		title: titleSegment?.text ?? page.slug,
		userName: page.userName,
		userHandle: page.userHandle,
	});

	return new Response(svg, {
		headers: {
			"content-type": "image/svg+xml; charset=utf-8",
			"cache-control": OG_CACHE_CONTROL,
		},
	});
};
