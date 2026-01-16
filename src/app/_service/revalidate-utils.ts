import { revalidatePath } from "next/cache";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";

export function revalidateAllLocales(
	basePath: string,
	revalidateFn: (path: string) => void = revalidatePath,
) {
	// Default-locale path (no prefix in as-needed strategy)
	revalidateFn(basePath);
	// Locale-prefixed paths
	for (const { code } of supportedLocaleOptions) {
		revalidateFn(`/${code}${basePath}`);
	}
}

/**
 * Revalidate a specific page for a specific locale.
 * Fetches page info and revalidates only the specified locale path.
 */
export async function revalidatePageForLocale(
	pageId: number,
	locale: string,
	revalidateFn: (path: string) => void = revalidatePath,
) {
	const result = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select(["pages.slug", "users.handle as userHandle"])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	if (result) {
		revalidateFn(`/${locale}/user/${result.userHandle}/page/${result.slug}`);
	}
}

/**
 * Revalidate self + all ancestors and all descendants (recursive) across locales.
 * Note: descendants are limited to PUBLIC to match visible routes.
 */
export async function revalidatePageTreeAllLocales(
	pageId: number,
	revalidateFn: (path: string) => void = revalidatePath,
) {
	// Fetch self and initial parentId
	const self = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.id",
			"pages.slug",
			"users.handle as userHandle",
			"pages.parentId",
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	if (!self) return;

	const paths = new Set<string>();
	const visitedIds = new Set<number>([self.id]);
	// Add self
	paths.add(`/user/${self.userHandle}/page/${self.slug}`);

	// Walk ancestors
	let currentParentId = self.parentId ?? null;
	const ancestorGuard = new Set<number>();
	while (currentParentId && !ancestorGuard.has(currentParentId)) {
		ancestorGuard.add(currentParentId);
		const parent = await db
			.selectFrom("pages")
			.innerJoin("users", "pages.userId", "users.id")
			.select([
				"pages.id",
				"pages.slug",
				"users.handle as userHandle",
				"pages.parentId",
			])
			.where("pages.id", "=", currentParentId)
			.executeTakeFirst();

		if (!parent) break;
		paths.add(`/user/${parent.userHandle}/page/${parent.slug}`);
		visitedIds.add(parent.id);
		currentParentId = parent.parentId ?? null;
	}

	// Walk descendants (BFS)
	let frontier: number[] = [self.id];
	const childGuard = new Set<number>([self.id]);
	while (frontier.length > 0) {
		const children = await db
			.selectFrom("pages")
			.innerJoin("users", "pages.userId", "users.id")
			.select(["pages.id", "pages.slug", "users.handle as userHandle"])
			.where("pages.parentId", "in", frontier)
			.where("pages.status", "=", "PUBLIC" satisfies PageStatus)
			.orderBy("pages.order", "asc")
			.execute();

		const next: number[] = [];
		for (const c of children) {
			if (childGuard.has(c.id)) continue;
			childGuard.add(c.id);
			visitedIds.add(c.id);
			paths.add(`/user/${c.userHandle}/page/${c.slug}`);
			next.push(c.id);
		}
		frontier = next;
	}

	for (const basePath of paths) {
		revalidateAllLocales(basePath, revalidateFn);
	}
}
