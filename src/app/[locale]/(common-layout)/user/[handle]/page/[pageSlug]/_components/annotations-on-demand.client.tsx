"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
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
	const enabledTypes = types.filter(Boolean);
	const enabledTypesKey = enabledTypes.join("~");

	const [contentEl, setContentEl] = useState<Element | null>(null);
	const [byNumber, setByNumber] = useState<ByNumber>({});
	const inFlightRef = useRef<Map<string, AbortController>>(new Map());
	const rootsRef = useRef<Map<number, HTMLElement>>(new Map());

	const resetKey = `${pageId}:${userLocale}:${enabledTypesKey}`;

	useEffect(() => {
		void resetKey;
		for (const controller of inFlightRef.current.values()) controller.abort();
		inFlightRef.current.clear();
		setByNumber({});
		setContentEl(null);
		for (const root of rootsRef.current.values()) root.remove();
		rootsRef.current.clear();
	}, [resetKey]);

	useEffect(() => {
		if (!enabledTypesKey) return;

		let cancelled = false;
		const fetchRange = async (from: number, to: number) => {
			const requestKey = `${from}:${to}:${enabledTypesKey}:${userLocale}`;
			if (inFlightRef.current.has(requestKey)) return;

			const controller = new AbortController();
			inFlightRef.current.set(requestKey, controller);

			const url = new URL("/api/page-annotations", window.location.origin);
			url.searchParams.set("pageId", String(pageId));
			url.searchParams.set("from", String(from));
			url.searchParams.set("to", String(to));
			url.searchParams.set("types", enabledTypesKey);
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

		const run = () => {
			if (cancelled) return;
			const content = document.querySelector(".js-content");
			if (!content) {
				requestAnimationFrame(run);
				return;
			}
			setContentEl(content);

			const targets = content.querySelectorAll<HTMLElement>(
				".seg-src[data-number-id]:not(.seg-ann), .seg-tr[data-number-id]:not(.seg-ann)",
			);
			const numbers = Array.from(targets)
				.map((el) => Number(el.getAttribute("data-number-id")))
				.filter((n) => Number.isFinite(n));
			if (numbers.length === 0) return;
			const min = Math.min(...numbers);
			const max = Math.max(...numbers);
			const from = Math.max(0, min - range);
			const to = max + range;
			void fetchRange(from, to);
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [enabledTypesKey, pageId, range, userLocale]);

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

	const portals = (() => {
		const baseClassName = "block seg-cv";
		const interactive = true;

		return Object.entries(byNumber).flatMap(([k, annotations]) => {
			const mainNumber = Number(k);
			if (!Number.isFinite(mainNumber)) return [];
			if (!annotations || annotations.length === 0) return [];

			const root = rootsRef.current.get(mainNumber);
			if (!root) return [];

			const elements = annotations.flatMap((annotation) => {
				const typeKey = annotation.segmentType?.label ?? "";
				if (!typeKey) return [];

				const aHasTr = annotation.segmentTranslation !== null;
				const annotationBase =
					`${baseClassName} seg-ann hidden ml-4 text-sm leading-relaxed`.trim();

				const src = (
					<span
						className={`${annotationBase} seg-src ${aHasTr ? "seg-has-tr" : ""}`.trim()}
						data-annotation-type={typeKey}
						data-number-id={annotation.number}
						key={`ann-src-${annotation.id}`}
					>
						{sanitizeAndParseText(annotation.text ?? "")}
					</span>
				);

				if (!aHasTr) return [src];

				const tr = (
					<span
						className={`${annotationBase} seg-tr ${interactive ? "cursor-pointer select-text" : ""}`.trim()}
						data-annotation-type={typeKey}
						data-best-translation-id={annotation.segmentTranslation?.id}
						data-number-id={annotation.number}
						data-segment-id={annotation.id}
						key={`ann-tr-${annotation.id}`}
						role={interactive ? "button" : undefined}
						tabIndex={interactive ? 0 : undefined}
					>
						{sanitizeAndParseText(annotation.segmentTranslation?.text ?? "")}
					</span>
				);

				return [src, tr];
			});

			if (elements.length === 0) return [];
			return [createPortal(elements, root)];
		});
	})();

	if (!enabledTypesKey) return null;
	return <>{portals}</>;
}
