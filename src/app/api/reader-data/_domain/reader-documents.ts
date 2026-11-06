import { createHash } from "node:crypto";
import { VIEWS } from "@/app/_constants/view";
import { COMMENT_PAGE_SIZE } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/constants";
import type { fetchReaderCatalogSources } from "../_db/queries";

export function buildReaderDocuments(
	source: Awaited<ReturnType<typeof fetchReaderCatalogSources>>,
	locale: string,
) {
	const documents: Record<string, string> = {};
	const users = new Map(source.users.map((user) => [user.id, user]));
	const pages = new Map(source.pages.map((page) => [page.id, page]));
	const publicPages = source.pages.filter(
		(page) => page.status === "PUBLIC" && page.hasTitle,
	);
	const newest = [...publicPages].sort(
		(a, b) => b.createdAt - a.createdAt || b.id - a.id,
	);
	const roots = newest.filter((page) => page.parentId === null);
	const popular = [...roots].sort((a, b) => Number(b.likes) - Number(a.likes));
	const trees = new Map<number, { revision: number; size: number }>();
	const pageRoots = new Map<number, number>();
	for (const page of source.pages) {
		let root = page;
		const visited = new Set([root.id]);
		while (root.parentId !== null) {
			const parent = pages.get(root.parentId);
			if (!parent || visited.has(parent.id)) break;
			root = parent;
			visited.add(root.id);
		}
		pageRoots.set(page.id, root.id);
		const tree = trees.get(root.id);
		trees.set(root.id, {
			revision: Math.max(
				tree?.revision ?? 0,
				page.navigationRevision,
				users.get(page.userId)?.revision ?? 0,
			),
			size: (tree?.size ?? 0) + 1,
		});
	}
	const pageToken = (page: (typeof source.pages)[number]) => [
		page.id,
		page.revision,
		page.likes,
		page.views,
		users.get(page.userId)?.revision,
	];
	function add(path: string, dependencies: unknown) {
		const fingerprint = createHash("sha256")
			.update(JSON.stringify(dependencies))
			.digest("hex");
		for (const view of VIEWS) {
			const suffix =
				view === "both" ? "" : `${path.includes("?") ? "&" : "?"}view=${view}`;
			documents[path + suffix] = fingerprint;
		}
	}
	function addList(
		path: string,
		list: typeof source.pages,
		extra: unknown,
		count: number,
	) {
		const totalPages = Math.max(1, Math.ceil(count / 5));
		for (let page = 1; page <= totalPages; page++) {
			const url = new URL(path, "https://evame.tech");
			if (page > 1) url.searchParams.set("page", String(page));
			url.searchParams.sort();
			add(url.pathname + url.search, [
				totalPages,
				list.slice((page - 1) * 5, page * 5).map(pageToken),
				extra,
			]);
		}
	}
	const prefix = `/${locale}`;
	add(prefix, [
		roots.slice(0, 5).map(pageToken),
		popular.slice(0, 5).map(pageToken),
	]);
	const aboutPage = source.pages.find(
		(page) => page.slug === (locale === "ja" ? "evame" : "evame-ja"),
	);
	add(`${prefix}/about`, [source.stats, aboutPage?.revision]);
	add(`${prefix}/privacy`, null);
	add(`${prefix}/terms`, null);
	addList(`${prefix}/new-pages`, roots, null, roots.length);
	for (const user of source.users) {
		const followUsers = source.follows
			.filter(
				(follow) =>
					follow.followerId === user.id || follow.followingId === user.id,
			)
			.map((follow) => [
				follow.followerId,
				users.get(follow.followerId)?.revision,
				follow.followingId,
				users.get(follow.followingId)?.revision,
			]);
		const profile = [user.revision, followUsers];
		const userPages = roots.filter((page) => page.userId === user.id);
		addList(
			`${prefix}/${encodeURIComponent(user.handle)}`,
			popular.filter((page) => page.userId === user.id),
			profile,
			userPages.length,
		);
		addList(
			`${prefix}/${encodeURIComponent(user.handle)}?sort=new`,
			userPages,
			profile,
			userPages.length,
		);
	}
	for (const tag of new Set(source.tags.map((tag) => tag.name))) {
		const ids = new Set(
			source.tags.filter((row) => row.name === tag).map((row) => row.pageId),
		);
		addList(
			`${prefix}/tag/${encodeURIComponent(tag)}`,
			newest.filter((page) => ids.has(page.id)),
			null,
			source.pages.filter(
				(page) => page.status === "PUBLIC" && ids.has(page.id),
			).length,
		);
	}
	for (const page of publicPages) {
		const user = users.get(page.userId);
		if (!user) continue;
		const path = `${prefix}/${encodeURIComponent(user.handle)}/${encodeURIComponent(page.slug)}`;
		const comments = Math.max(
			1,
			Math.ceil(Number(page.commentRoots) / COMMENT_PAGE_SIZE),
		);
		const navigation = trees.get(pageRoots.get(page.id) ?? page.id) ?? null;
		const commentAuthors = source.commentAuthors
			.filter((comment) => comment.pageId === page.id)
			.map((comment) => [comment.userId, users.get(comment.userId)?.revision]);
		for (let commentPage = 1; commentPage <= comments; commentPage++)
			add(`${path}${commentPage === 1 ? "" : `?page=${commentPage}`}`, [
				pageToken(page),
				navigation,
				comments,
				commentAuthors,
			]);
	}
	return documents;
}
