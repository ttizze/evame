import type { ExecutionContext, R2Bucket } from "@cloudflare/workers-types";
import { schedulePublication } from "../shared/infra/reader-publication";
import { parseReaderRoute } from "../src/app/_domain/reader-route";

function publicationGroup(path: string) {
	let url: URL;
	try {
		url = new URL(path, "https://reader.invalid");
	} catch {
		return null;
	}
	if (path !== url.pathname + url.search) return null;
	const route = parseReaderRoute(url.pathname, url.search);
	if (route?.kind === "article")
		return `article:${route.handle}/${route.pageSlug}`;
	if (route?.kind === "home") return `home:${route.locale}`;
	return null;
}

// 配信方式の検証専用。生成済みの公開HTMLだけを受け取り、DBや編集APIを公開しない。
export default {
	async fetch(
		request: Request,
		env: {
			HTML: R2Bucket;
			PUBLICATION_PREFIX: string;
			PUBLICATION_SECRET: string;
		},
		context: Pick<ExecutionContext, "waitUntil">,
	) {
		const url = new URL(request.url);
		const headers = { "Cache-Control": "private, no-store" };
		if (
			url.pathname === "/__publication" ||
			url.pathname.startsWith("/__publication/")
		) {
			if (
				request.headers.get("Authorization") !==
				`Bearer ${env.PUBLICATION_SECRET}`
			)
				return new Response(null, { status: 403, headers });
			if (request.method !== "POST" && request.method !== "DELETE")
				return new Response(null, { status: 405, headers });
			let group: string;
			try {
				group = decodeURIComponent(
					url.pathname.slice("/__publication/".length),
				);
			} catch {
				return new Response(null, { status: 400, headers });
			}
			const groupPath = group.startsWith("article:")
				? `/en/${group.slice("article:".length).split("/").map(encodeURIComponent).join("/")}`
				: group.startsWith("home:")
					? `/${group.slice("home:".length)}`
					: null;
			if (groupPath === null || publicationGroup(groupPath) !== group)
				return new Response(null, { status: 404, headers });
			const key = `${env.PUBLICATION_PREFIX}/${encodeURIComponent(group)}`;
			if (request.method === "DELETE") {
				await env.HTML.delete(key);
				return new Response(null, { status: 204, headers });
			}
			let payload: { revision: unknown; pages: unknown };
			try {
				payload = await request.json();
			} catch {
				return new Response(null, { status: 400, headers });
			}
			if (!payload || typeof payload !== "object")
				return new Response(null, { status: 400, headers });
			const { revision, pages } = payload;
			if (
				typeof revision !== "number" ||
				!Number.isSafeInteger(revision) ||
				revision <= 0 ||
				(pages !== null &&
					(typeof pages !== "object" ||
						Array.isArray(pages) ||
						Object.keys(pages).length === 0 ||
						Object.entries(pages).some(
							([path, html]) =>
								publicationGroup(path) !== group || typeof html !== "string",
						)))
			)
				return new Response(null, { status: 400, headers });
			const body = JSON.stringify({
				revision,
				pages:
					pages === null
						? null
						: Object.fromEntries(
								Object.entries(pages).sort(([a], [b]) =>
									a < b ? -1 : a > b ? 1 : 0,
								),
							),
			});
			const digest = Array.from(
				new Uint8Array(
					await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
				),
				(byte) => byte.toString(16).padStart(2, "0"),
			).join("");
			const result = schedulePublication(env.HTML, key, revision, digest, body);
			context.waitUntil(result);
			const status = await result;
			return new Response(null, {
				status,
				headers:
					status === 429 || status === 503
						? { ...headers, "Retry-After": "1" }
						: headers,
			});
		}
		if (request.method !== "GET" && request.method !== "HEAD")
			return new Response(null, { status: 405, headers });
		const path = url.pathname + url.search;
		const group = publicationGroup(path);
		if (!group) return new Response(null, { status: 404, headers });
		const object = await env.HTML.get(
			`${env.PUBLICATION_PREFIX}/${encodeURIComponent(group)}`,
		);
		if (!object) return new Response(null, { status: 404, headers });
		const record = await object.json<{
			revision: number;
			pages: Record<string, string> | null;
		}>();
		const html = record.pages?.[path];
		if (html === undefined) return new Response(null, { status: 404, headers });
		return new Response(request.method === "HEAD" ? null : html, {
			headers: {
				...headers,
				"Content-Type": "text/html; charset=utf-8",
				ETag: object.httpEtag,
				"X-Publication-Revision": String(record.revision),
			},
		});
	},
};
