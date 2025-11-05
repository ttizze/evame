import { revalidatePath } from "next/cache";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { prisma } from "@/lib/prisma";

type RevalidateAllLocalesOptions = {
	revalidateFn?: (path: string) => void;
	locales?: Iterable<string>;
};

const SUPPORTED_LOCALE_CODES = new Set(
	supportedLocaleOptions.map(({ code }) => code),
);

function normalizeLocaleList(locales?: Iterable<string>) {
	const codes = locales
		? Array.from(
			new Set(Array.from(locales).map((code) => code.trim().toLowerCase())),
		  )
		: supportedLocaleOptions.map(({ code }) => code);
	return codes.filter((code) => code && SUPPORTED_LOCALE_CODES.has(code));
}

export function revalidateAllLocales(
	basePath: string,
	revalidateFnOrOptions?: ((path: string) => void) | RevalidateAllLocalesOptions,
	maybeOptions?: RevalidateAllLocalesOptions,
) {
	let revalidateFn = revalidatePath;
	let locales: string[] | undefined;

	if (typeof revalidateFnOrOptions === "function") {
		revalidateFn = revalidateFnOrOptions;
		locales = normalizeLocaleList(maybeOptions?.locales);
	} else if (revalidateFnOrOptions) {
		revalidateFn =
			revalidateFnOrOptions.revalidateFn ?? revalidateFn;
		locales = normalizeLocaleList(revalidateFnOrOptions.locales);
	} else {
		locales = normalizeLocaleList();
	}

	if (!locales) {
		locales = normalizeLocaleList();
	}

	// Default-locale path (no prefix in as-needed strategy)
	revalidateFn(basePath);
	// Locale-prefixed paths
	for (const code of locales) {
		revalidateFn(`/${code}${basePath}`);
	}
}

/**
 * Revalidate self and ancestors across locales that actually exist for the page.
 */
type RevalidatePageTreeOptions = {
	revalidateFn?: (path: string) => void;
};

type PageForRevalidate = {
	id: number;
	slug: string;
	parentId: number | null;
	sourceLocale: string;
	locales: string[];
	handle: string;
};

function toLocales(sourceLocale: string, locales: string[]) {
	const merged = new Set<string>();
	const normalizedSource = sourceLocale.trim().toLowerCase();
	if (normalizedSource && SUPPORTED_LOCALE_CODES.has(normalizedSource)) {
		merged.add(normalizedSource);
	}
	for (const locale of locales) {
		const normalized = locale.trim().toLowerCase();
		if (normalized && SUPPORTED_LOCALE_CODES.has(normalized)) {
			merged.add(normalized);
		}
	}
	return Array.from(merged);
}

async function fetchPageForRevalidate(pageId: number): Promise<PageForRevalidate | null> {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		select: {
			id: true,
			slug: true,
			parentId: true,
			sourceLocale: true,
			user: { select: { handle: true } },
			pageLocaleTranslationProofs: { select: { locale: true } },
		},
	});
	if (!page) return null;
	return {
		id: page.id,
		slug: page.slug,
		parentId: page.parentId ?? null,
		sourceLocale: page.sourceLocale,
		locales: page.pageLocaleTranslationProofs.map((proof) => proof.locale),
		handle: page.user.handle,
	};
}

export async function revalidatePageTreeAllLocales(
	pageId: number,
	options: RevalidatePageTreeOptions = {},
) {
	const revalidateFn = options.revalidateFn ?? revalidatePath;

	// Fetch self and initial parentId
	const self = await fetchPageForRevalidate(pageId);
	if (!self) return;

	const targets = new Map<string, string[]>();
	// Add self
	targets.set(
		`/user/${self.handle}/page/${self.slug}`,
		toLocales(self.sourceLocale, self.locales),
	);

	// Walk ancestors
	let currentParentId = self.parentId ?? null;
	const ancestorGuard = new Set<number>();
	while (currentParentId && !ancestorGuard.has(currentParentId)) {
		ancestorGuard.add(currentParentId);
		const parent = await fetchPageForRevalidate(currentParentId);
		if (!parent) break;
		targets.set(
			`/user/${parent.handle}/page/${parent.slug}`,
			toLocales(parent.sourceLocale, parent.locales),
		);
		currentParentId = parent.parentId ?? null;
	}

	for (const [basePath, locales] of targets) {
		revalidateAllLocales(basePath, { revalidateFn, locales });
	}
}
