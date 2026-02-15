import type { SearchParams } from "nuqs/server";
import type { ReactNode } from "react";

type StripQueryAndHash<Path extends string> =
	Path extends `${infer P}?${string}`
		? P
		: Path extends `${infer P}#${string}`
			? P
			: Path;

type TrimSlashes<Path extends string> = Path extends `/${infer R}`
	? TrimSlashes<R>
	: Path extends `${infer R}/`
		? TrimSlashes<R>
		: Path;

type SplitPath<Path extends string> = Path extends `${infer Head}/${infer Tail}`
	? Head | SplitPath<Tail>
	: Path;

type RouteParamEntry<Segment extends string> =
	Segment extends `[[...${infer Key}]]`
		? { key: Key; value: string[] | undefined }
		: Segment extends `[...${infer Key}]`
			? { key: Key; value: string[] }
			: Segment extends `[${infer Key}]`
				? { key: Key; value: string }
				: never;

type RouteParamEntries<Path extends string> = RouteParamEntry<
	SplitPath<TrimSlashes<StripQueryAndHash<Path>>>
>;

type RouteParams<Path extends string> = [RouteParamEntries<Path>] extends [
	never,
]
	? Record<string, never>
	: {
			[Entry in RouteParamEntries<Path> as Entry["key"]]: Entry["value"];
		};

declare global {
	/**
	 * Next.js App Router props types used across this repo.
	 *
	 * We intentionally keep them independent of `.next/types` so `tsc --noEmit`
	 * works even when `.next` is not present in a git worktree.
	 */
	type PageProps<RoutePath extends string> = {
		params: Promise<RouteParams<RoutePath>>;
		searchParams: Promise<SearchParams>;
	};

	type LayoutProps<RoutePath extends string> = {
		children: ReactNode;
		params: Promise<RouteParams<RoutePath>>;
	};

	type RouteContext<RoutePath extends string> = {
		params: Promise<RouteParams<RoutePath>>;
	};
}
