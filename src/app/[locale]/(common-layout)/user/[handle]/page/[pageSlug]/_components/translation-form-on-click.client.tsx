"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AddAndVoteTranslations } from "./translation-section/add-and-vote-translations.client";

/** Portal用rootを.seg-trの直後に確保（既存があれば再利用） */
function ensureFormRoot(afterEl: Element): HTMLElement {
	const next = afterEl.nextElementSibling;
	if (next instanceof HTMLElement && next.dataset.trFormRoot) return next;

	const root = document.createElement("div");
	root.dataset.trFormRoot = "1";
	root.className = "not-prose";
	afterEl.insertAdjacentElement("afterend", root);
	return root;
}

/** クリック位置がテキスト上かを判定（余白クリックを除外するため） */
function isClickOnText(e: MouseEvent): boolean {
	const d = document as Document & {
		caretRangeFromPoint?: (x: number, y: number) => Range | null;
		caretPositionFromPoint?: (
			x: number,
			y: number,
		) => { offsetNode: Node | null } | null;
	};
	// jsdom等では API が無いのでチェックをスキップ
	if (!d.caretRangeFromPoint && !d.caretPositionFromPoint) return true;

	const range = d.caretRangeFromPoint?.(e.clientX, e.clientY);
	if (range) return range.startContainer.nodeType === Node.TEXT_NODE;

	const pos = d.caretPositionFromPoint?.(e.clientX, e.clientY);
	return pos?.offsetNode?.nodeType === Node.TEXT_NODE;
}

function hasSelection(): boolean {
	const sel = window.getSelection?.();
	return !!sel && !sel.isCollapsed && sel.toString().length > 0;
}

/**
 * クリックした訳文の段だけ「投票/追加フォーム」を出すためのクライアント側ブリッジ。
 *
 * 仕組み:
 * - document.body に1本だけ click リスナーを付ける（イベント委譲）
 * - クリックされた .seg-tr の直後に Portal 用 root を作り AddAndVoteTranslations を差し込む
 * - useRef で最新状態を保持し、リスナー再登録を防ぐ
 */
export function TranslationFormOnClick() {
	const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
	const stateRef = useRef<{
		segmentId: number | null;
		rootEl: HTMLElement | null;
	}>({
		segmentId: null,
		rootEl: null,
	});

	useEffect(() => {
		let hadSelectionOnPointerDown = false;

		/** セグメントのトグル処理（開く/閉じる） */
		const toggleSegment = (el: HTMLElement) => {
			const segId = Number(el.dataset.segmentId);
			if (!Number.isFinite(segId)) return;

			// 同じセグメントをクリック → 閉じる
			if (stateRef.current.segmentId === segId) {
				stateRef.current = { segmentId: null, rootEl: null };
				setActiveSegmentId(null);
				return;
			}

			const translationBlock = el.closest(".seg-tr");
			if (!translationBlock) return;

			const rootEl = ensureFormRoot(translationBlock);
			stateRef.current = { segmentId: segId, rootEl };
			setActiveSegmentId(segId);
		};

		/** data-segment-id を持つ要素を取得（リンク内は除外） */
		const getSegmentEl = (target: EventTarget | null): HTMLElement | null => {
			if (!(target instanceof Element)) return null;
			const el = target.closest("[data-segment-id]") as HTMLElement | null;
			if (!el || el.closest("a")) return null;
			return el;
		};

		const onPointerDown = () => {
			hadSelectionOnPointerDown = hasSelection();
		};

		const onClick = (e: MouseEvent) => {
			if (hadSelectionOnPointerDown || hasSelection()) return;
			if (!isClickOnText(e)) return;

			const el = getSegmentEl(e.target);
			if (el) toggleSegment(el);
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Enter" && e.key !== " ") return;

			const el = getSegmentEl(e.target);
			if (!el) return;

			if (e.key === " ") e.preventDefault();
			toggleSegment(el);
		};

		document.body.addEventListener("pointerdown", onPointerDown, true);
		document.body.addEventListener("click", onClick);
		document.body.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.removeEventListener("pointerdown", onPointerDown, true);
			document.body.removeEventListener("click", onClick);
			document.body.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	const { segmentId, rootEl } = stateRef.current;
	if (!activeSegmentId || !rootEl) return null;

	return createPortal(
		<AddAndVoteTranslations open segmentId={segmentId!} />,
		rootEl,
	);
}
