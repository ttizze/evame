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
 *   （`WrapSegment` が訳文を `<button data-segment-id="...">` として出す）。
 * - `document.body` に 1 本だけ click リスナーを付ける（イベント委譲）ことで、
 *   本文だけでなくコメント内の訳文ボタンも同じ挙動で拾える。
 * - クリックされた `.seg-tr` の直後に Portal 用の root を作り、
 *   そこへ `AddAndVoteTranslations` を `createPortal` で差し込む。
 *
 * 重要:
 * - `data-segment-id` は「クリック可能な訳文ボタン」にだけ付けること。
 *   `p/li` など親要素に付けると、余白クリックでもUIが開いてしまう。
 */
export function TranslationFormOnClick() {
	const [segmentId, setSegmentId] = useState<number | null>(null);
	const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const container = document.body;

		const onClick = async (e: MouseEvent) => {
			const target = e.target instanceof Element ? e.target : null;
			const btn = target?.closest?.("[data-segment-id]") as HTMLElement | null;
			if (!btn) return;
			if (!(container as HTMLElement).contains(btn)) return;

			const segIdRaw = btn.dataset.segmentId;
			const segId = segIdRaw ? Number(segIdRaw) : NaN;
			if (!Number.isFinite(segId)) return;

			// Toggle off when clicking the same translation again
			if (segmentId === segId) {
				setSegmentId(null);
				setRootEl(null);
				return;
			}

			const translationBlock = btn.closest(".seg-tr");
			if (!translationBlock) return;
			setRootEl(ensureFormRoot(translationBlock));
			setSegmentId(segId);
		};

		const listener = (e: Event) => {
			void onClick(e as MouseEvent);
		};
		container.addEventListener("click", listener);
		return () => container.removeEventListener("click", listener);
	}, [segmentId]);

	if (!segmentId || !rootEl) return null;

	return createPortal(
		<AddAndVoteTranslations open={true} segmentId={segmentId} />,
		rootEl,
	);
}
