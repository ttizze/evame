"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mdastToReactClient } from "@/app/[locale]/(common-layout)/_components/mdast-to-react/client";
import type { PageSectionsResponse } from "@/app/api/page-sections/types";

type ApiResponse = PageSectionsResponse;

export function SectionLoader(props: {
	slug: string;
	locale: string;
	totalSections: number;
	startSection: number;
}) {
	const { slug, locale, totalSections, startSection } = props;

	const [nextSection, setNextSection] = useState(startSection);
	const [sections, setSections] = useState<
		Array<{ section: number; element: ReactNode }>
	>([]);
	const [hasMore, setHasMore] = useState(nextSection < totalSections);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const canLoad = useMemo(
		() => hasMore && !loading && !error,
		[hasMore, loading, error],
	);

	const loadNext = useCallback(async () => {
		if (!canLoad) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/page-sections?slug=${encodeURIComponent(slug)}&locale=${encodeURIComponent(locale)}&section=${nextSection}`,
			);
			const data = (await res.json()) as ApiResponse;
			if (!res.ok || "error" in data) {
				throw new Error("Failed to load section");
			}
			const element = await mdastToReactClient({
				mdast: data.mdastJson,
				segments: data.segments,
				interactive: true,
			});
			setSections((prev) => [...prev, { section: data.section, element }]);
			setHasMore(data.hasMore);
			setNextSection(data.section + 1);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load section");
		} finally {
			setLoading(false);
		}
	}, [canLoad, slug, locale, nextSection]);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				void loadNext();
			},
			{ rootMargin: "800px 0px" },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [loadNext]);

	if (!hasMore && sections.length === 0) return null;

	return (
		<div className="mt-10">
			{sections.map((s) => (
				<div key={s.section}>{s.element}</div>
			))}
			<div ref={sentinelRef} />
			{loading ? (
				<div className="not-prose text-muted-foreground text-sm py-6">
					Loading…
				</div>
			) : null}
			{error ? (
				<div className="not-prose py-6">
					<p className="text-sm text-destructive">{error}</p>
					<button
						className="text-sm underline"
						onClick={() => void loadNext()}
						type="button"
					>
						Retry
					</button>
				</div>
			) : null}
		</div>
	);
}
