"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.client";

type AnnotationSegment = {
	id: number;
	number: number;
	text: string;
	segmentType: { key: string; label: string };
	segmentTranslation: { id: number; text: string } | null;
};

type ByNumber = Record<number, AnnotationSegment[]>;

function ensureAnnotationRoot(afterEl: Element) {
	const existing = afterEl.nextElementSibling;
	if (
		existing &&
		existing instanceof HTMLElement &&
		existing.dataset.annotationsRoot
	) {
		return existing;
	}
	const root = document.createElement("div");
	root.dataset.annotationsRoot = "1";
	root.className = "not-prose";
	afterEl.insertAdjacentElement("afterend", root);
	return root;
}

function isValidNumberAttr(v: string | null): v is string {
	return !!v && /^-?\d+$/.test(v);
}

export function AnnotationsOnDemand({
	pageId,
	userLocale,
	range = 50,
}: {
	pageId: number;
	userLocale: string;
	range?: number;
}) {
	const [types] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~").withDefault([]).withOptions({
			shallow: true,
		}),
	);
	const enabledTypes = useMemo(() => types.filter(Boolean), [types]);

	const [contentEl, setContentEl] = useState<Element | null>(null);
	const [byNumber, setByNumber] = useState<ByNumber>({});
	const inFlightRef = useRef<Map<string, AbortController>>(new Map());
	const rootsRef = useRef<Map<number, HTMLElement>>(new Map());
	const inViewRef = useRef<Set<number>>(new Set());
	const rafRef = useRef<number | null>(null);
	const loadedIntervalsRef = useRef<Array<{ from: number; to: number }>>([]);

	const resetKey = `${pageId}:${userLocale}:${enabledTypes.join("~")}`;

	useEffect(() => {
		void resetKey;
		for (const controller of inFlightRef.current.values()) controller.abort();
		inFlightRef.current.clear();
		setByNumber({});
		loadedIntervalsRef.current = [];
		setContentEl(null);
		for (const root of rootsRef.current.values()) root.remove();
		rootsRef.current.clear();
	}, [resetKey]);

	useEffect(() => {
		if (enabledTypes.length === 0) return;

		const content = document.querySelector(".js-content");
		if (!content) return;
		setContentEl(content);

		const mergeIntervals = (intervals: Array<{ from: number; to: number }>) => {
			const sorted = [...intervals]
				.map((x) => ({
					from: Math.min(x.from, x.to),
					to: Math.max(x.from, x.to),
				}))
				.sort((a, b) => a.from - b.from);
			const merged: Array<{ from: number; to: number }> = [];
			for (const cur of sorted) {
				const last = merged.at(-1);
				if (!last || cur.from > last.to + 1) merged.push(cur);
				else last.to = Math.max(last.to, cur.to);
			}
			return merged;
		};

		const computeMissing = (
			need: { from: number; to: number },
			loaded: Array<{ from: number; to: number }>,
		) => {
			const needFrom = Math.min(need.from, need.to);
			const needTo = Math.max(need.from, need.to);
			const merged = mergeIntervals(loaded);
			const missing: Array<{ from: number; to: number }> = [];
			let cursor = needFrom;
			for (const i of merged) {
				if (i.to < cursor) continue;
				if (i.from > needTo) break;
				if (i.from > cursor) missing.push({ from: cursor, to: i.from - 1 });
				cursor = Math.max(cursor, i.to + 1);
				if (cursor > needTo) break;
			}
			if (cursor <= needTo) missing.push({ from: cursor, to: needTo });
			return missing.filter((m) => m.to >= m.from);
		};

		const fetchRange = async (from: number, to: number) => {
			const requestKey = `${from}:${to}:${enabledTypes.join("~")}:${userLocale}`;
			if (inFlightRef.current.has(requestKey)) return;

			const controller = new AbortController();
			inFlightRef.current.set(requestKey, controller);

			const url = new URL("/api/page-annotations", window.location.origin);
			url.searchParams.set("pageId", String(pageId));
			url.searchParams.set("from", String(from));
			url.searchParams.set("to", String(to));
			url.searchParams.set("types", enabledTypes.join("~"));
			url.searchParams.set("userLocale", userLocale);

			try {
				const res = await fetch(url, { signal: controller.signal });
				if (!res.ok) return;
				const data = (await res.json()) as { byNumber: ByNumber };
				setByNumber((prev) => {
					const next: ByNumber = { ...prev };
					for (const [k, v] of Object.entries(data.byNumber ?? {})) {
						const num = Number(k);
						if (!Number.isFinite(num)) continue;
						const merged = [...(next[num] ?? []), ...v];
						const seen = new Set<number>();
						next[num] = merged.filter((a) => {
							if (seen.has(a.id)) return false;
							seen.add(a.id);
							return true;
						});
					}
					return next;
				});

				loadedIntervalsRef.current = mergeIntervals([
					...loadedIntervalsRef.current,
					{ from, to },
				]);
			} catch (error) {
				// Abort is expected when toggling annotation types / route changes.
				if (
					typeof error === "object" &&
					error !== null &&
					"name" in error &&
					(error as { name?: unknown }).name === "AbortError"
				) {
					return;
				}
				throw error;
			} finally {
				inFlightRef.current.delete(requestKey);
			}
		};

		const schedule = () => {
			if (rafRef.current !== null) return;
			rafRef.current = window.requestAnimationFrame(() => {
				rafRef.current = null;
				const numbers = Array.from(inViewRef.current.values());
				if (numbers.length === 0) return;
				const min = Math.min(...numbers);
				const max = Math.max(...numbers);
				const need = { from: Math.max(0, min - range), to: max + range };
				const missing = computeMissing(need, loadedIntervalsRef.current);
				for (const m of missing) {
					void fetchRange(m.from, m.to);
				}
			});
		};

		const io = new IntersectionObserver(
			(entries) => {
				let changed = false;
				for (const entry of entries) {
					const el = entry.target as HTMLElement;
					if (el.classList.contains("seg-ann")) continue;
					const raw = el.getAttribute("data-number-id");
					if (!isValidNumberAttr(raw)) continue;
					const num = Number(raw);
					if (!Number.isFinite(num)) continue;
					if (entry.isIntersecting) {
						if (!inViewRef.current.has(num)) {
							inViewRef.current.add(num);
							changed = true;
						}
					} else {
						if (inViewRef.current.delete(num)) changed = true;
					}
				}
				if (changed) schedule();
			},
			{ root: null, rootMargin: "800px 0px 800px 0px", threshold: 0 },
		);

		const targets = content.querySelectorAll<HTMLElement>(
			".seg-src[data-number-id], .seg-tr[data-number-id]",
		);
		for (const el of targets) io.observe(el);

		// Initial schedule (in case intersection doesn't fire immediately)
		schedule();

		return () => {
			io.disconnect();
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [enabledTypes, pageId, range, userLocale]);

	useEffect(() => {
		if (!contentEl) return;
		for (const [key, annotations] of Object.entries(byNumber)) {
			const mainNumber = Number(key);
			if (!Number.isFinite(mainNumber)) continue;
			if (!annotations || annotations.length === 0) continue;
			if (rootsRef.current.has(mainNumber)) continue;

			const selector = String(mainNumber);
			const anchor =
				contentEl.querySelector(
					`.seg-tr[data-number-id="${selector}"]:not(.seg-ann)`,
				) ??
				contentEl.querySelector(
					`.seg-src[data-number-id="${selector}"]:not(.seg-ann)`,
				);
			if (!anchor) continue;

			const root = ensureAnnotationRoot(anchor);
			rootsRef.current.set(mainNumber, root);
		}
	}, [byNumber, contentEl]);

	const portals = useMemo(() => {
		if (!contentEl) return [];

		return Object.entries(byNumber).flatMap(([k, annotations]) => {
			const mainNumber = Number(k);
			if (!Number.isFinite(mainNumber)) return [];
			if (!annotations || annotations.length === 0) return [];

			const root = rootsRef.current.get(mainNumber);
			if (!root) return [];

			const elements = annotations.flatMap((a) => {
				const typeKey = a.segmentType?.label ?? "";
				if (!typeKey) return [];

				const base = "block seg-cv seg-ann hidden ml-4 text-sm leading-relaxed";
				const src = (
					<div
						className={`${base} seg-src ${a.segmentTranslation ? "seg-has-tr" : ""}`.trim()}
						data-annotation-type={typeKey}
						data-number-id={a.number}
						key={`ann-src-${a.id}`}
					>
						{sanitizeAndParseText(a.text ?? "")}
					</div>
				);

				if (!a.segmentTranslation) return [src];

				const tr = (
					<button
						className={`${base} seg-tr cursor-pointer select-text text-left`.trim()}
						data-annotation-type={typeKey}
						data-best-translation-id={a.segmentTranslation.id}
						data-number-id={a.number}
						data-segment-id={a.id}
						key={`ann-tr-${a.id}`}
						type="button"
					>
						{sanitizeAndParseText(a.segmentTranslation.text ?? "")}
					</button>
				);

				return [src, tr];
			});

			if (elements.length === 0) return [];
			return [createPortal(elements, root)];
		});
	}, [byNumber, contentEl]);

	if (enabledTypes.length === 0) return null;
	return <>{portals}</>;
}
