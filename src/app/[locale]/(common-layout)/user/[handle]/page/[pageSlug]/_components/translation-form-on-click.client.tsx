"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AddAndVoteTranslations } from "@/app/[locale]/(common-layout)/_components/wrap-segments/translation-section/add-and-vote-translations.client";

function ensureFormRoot(afterEl: Element) {
	const existing = afterEl.nextElementSibling;
	if (
		existing &&
		existing instanceof HTMLElement &&
		existing.dataset.trFormRoot
	) {
		return existing;
	}
	const root = document.createElement("div");
	root.dataset.trFormRoot = "1";
	root.className = "not-prose";
	afterEl.insertAdjacentElement("afterend", root);
	return root;
}

/**
 * クリックした訳文の段だけ「投票/追加フォーム」を出すためのクライアント側ブリッジ。
 *
 * 目的:
 * - 段ごとに Client Component を置かず（水和を増やさず）、
 *   必要なときだけ重いUIを出す。
 *
 * 仕組み:
 * - 本文/コメントのセグメントは Server Component 側で静的にレンダする
 *   （`WrapSegment` が訳文ブロック（`.seg-tr`）に `data-segment-id` を付けて出す）。
 * - `document.body` に 1 本だけ click リスナーを付ける（イベント委譲）ことで、
 *   本文だけでなくコメント内の訳文ボタンも同じ挙動で拾える。
 * - クリックされた `.seg-tr` の直後に Portal 用の root を作り、
 *   そこへ `AddAndVoteTranslations` を `createPortal` で差し込む。
 *
 * 重要:
 * - `.seg-tr` はブロック要素なので、余白クリックまで拾うと体験が悪い。
 *   そのため「クリック位置が実際にテキスト上か」をチェックしてから開く。
 */
export function TranslationFormOnClick() {
	const [segmentId, setSegmentId] = useState<number | null>(null);
	const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const container = document.body;
		const hadSelectionOnPointerDownRef = { current: false };

		const isClickOnText = (e: MouseEvent) => {
			// Chrome: caretRangeFromPoint / Safari: caretRangeFromPoint
			const d = document as Document & {
				caretRangeFromPoint?: (x: number, y: number) => Range | null;
				caretPositionFromPoint?: (
					x: number,
					y: number,
				) => { offsetNode: Node | null } | null;
			};

			// jsdom や一部環境では API が無いので、その場合はチェックをスキップする。
			if (!d.caretRangeFromPoint && !d.caretPositionFromPoint) return true;

			const range = d.caretRangeFromPoint?.(e.clientX, e.clientY);
			if (range) return range.startContainer.nodeType === Node.TEXT_NODE;

			const pos = d.caretPositionFromPoint?.(e.clientX, e.clientY);
			return pos?.offsetNode?.nodeType === Node.TEXT_NODE;
		};

		const getHasSelection = () => {
			const sel = window.getSelection?.();
			return !!sel && !sel.isCollapsed && sel.toString().length > 0;
		};

		const onPointerDown = () => {
			// 「選択解除のためのクリック」でも UI が開くと邪魔なので、
			// pointerdown 時点で選択があればこのクリックは無視する。
			hadSelectionOnPointerDownRef.current = getHasSelection();
		};

		const onClick = async (e: MouseEvent) => {
			const target = e.target instanceof Element ? e.target : null;
			const el = target?.closest?.("[data-segment-id]") as HTMLElement | null;
			if (!el) return;
			if (!(container as HTMLElement).contains(el)) return;
			if (hadSelectionOnPointerDownRef.current) return;
			if (getHasSelection()) return;
			if (!isClickOnText(e)) return;

			const segIdRaw = el.dataset.segmentId;
			const segId = segIdRaw ? Number(segIdRaw) : NaN;
			if (!Number.isFinite(segId)) return;

			// Toggle off when clicking the same translation again
			if (segmentId === segId) {
				setSegmentId(null);
				setRootEl(null);
				return;
			}

			const translationBlock = el.closest(".seg-tr");
			if (!translationBlock) return;
			setRootEl(ensureFormRoot(translationBlock));
			setSegmentId(segId);
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Enter" && e.key !== " ") return;

			const target = e.target instanceof Element ? e.target : null;
			const el = target?.closest?.("[data-segment-id]") as HTMLElement | null;
			if (!el) return;
			if (!(container as HTMLElement).contains(el)) return;

			// Prevent page scroll on Space
			if (e.key === " ") e.preventDefault();

			const segIdRaw = el.dataset.segmentId;
			const segId = segIdRaw ? Number(segIdRaw) : NaN;
			if (!Number.isFinite(segId)) return;

			if (segmentId === segId) {
				setSegmentId(null);
				setRootEl(null);
				return;
			}

			const translationBlock = el.closest(".seg-tr");
			if (!translationBlock) return;
			setRootEl(ensureFormRoot(translationBlock));
			setSegmentId(segId);
		};

		const listener = (e: Event) => {
			void onClick(e as MouseEvent);
		};
		container.addEventListener("pointerdown", onPointerDown, true);
		container.addEventListener("click", listener);
		container.addEventListener("keydown", onKeyDown);
		return () => {
			container.removeEventListener("pointerdown", onPointerDown, true);
			container.removeEventListener("click", listener);
			container.removeEventListener("keydown", onKeyDown);
		};
	}, [segmentId]);

	if (!segmentId || !rootEl) return null;

	return createPortal(
		<AddAndVoteTranslations open={true} segmentId={segmentId} />,
		rootEl,
	);
}
