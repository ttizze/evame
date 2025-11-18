import { revalidatePath } from "next/cache";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { prisma } from "@/lib/prisma";

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
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		select: { slug: true, user: { select: { handle: true } } },
	});
	if (page) {
		revalidateFn(`/${locale}/user/${page.user.handle}/page/${page.slug}`);
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
	const self = await prisma.page.findUnique({
		where: { id: pageId },
		select: {
			id: true,
			slug: true,
			user: { select: { handle: true } },
			parentId: true,
		},
	});
	if (!self) return;

	const paths = new Set<string>();
	const visitedIds = new Set<number>([self.id]);
	// Add self
	paths.add(`/user/${self.user.handle}/page/${self.slug}`);

	// Walk ancestors
	let currentParentId = self.parentId ?? null;
	const ancestorGuard = new Set<number>();
	while (currentParentId && !ancestorGuard.has(currentParentId)) {
		ancestorGuard.add(currentParentId);
		const parent = await prisma.page.findUnique({
			where: { id: currentParentId },
			select: {
				id: true,
				slug: true,
				user: { select: { handle: true } },
				parentId: true,
			},
		});
		if (!parent) break;
		paths.add(`/user/${parent.user.handle}/page/${parent.slug}`);
		visitedIds.add(parent.id);
		currentParentId = parent.parentId ?? null;
	}

	// Walk descendants (BFS)
	let frontier: number[] = [self.id];
	const childGuard = new Set<number>([self.id]);
	while (frontier.length > 0) {
		const children = await prisma.page.findMany({
			where: { parentId: { in: frontier }, status: "PUBLIC" },
			select: { id: true, slug: true, user: { select: { handle: true } } },
			orderBy: { order: "asc" },
		});
		const next: number[] = [];
		for (const c of children) {
			if (childGuard.has(c.id)) continue;
			childGuard.add(c.id);
			visitedIds.add(c.id);
			paths.add(`/user/${c.user.handle}/page/${c.slug}`);
			next.push(c.id);
		}
		frontier = next;
	}

	for (const basePath of paths) {
		revalidateAllLocales(basePath, revalidateFn);
	}
}
