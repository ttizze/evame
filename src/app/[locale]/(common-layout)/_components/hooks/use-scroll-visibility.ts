"use client";
import { useEffect, useRef, useState } from "react";
import { subscribeScrollY } from "@/app/[locale]/(common-layout)/_components/header/hooks/scroll-y-store.client";

/**
 * 読み込み時に表示 → 下スクロールで非表示 → 上スクロールで再表示
 */
export function useScrollVisibility(alwaysVisible = false) {
	const [isVisible, setVisible] = useState(true); // ① 初期表示

	const lastY = useRef(0); // 前回の scrollY
	const ticking = useRef(false); // rAF 同期用
	const ignore = useRef(false); // クリック直後無視
	const visibleRef = useRef(true);
	const latestY = useRef(0);

	/** ボタンを押した瞬間のチラつきを防ぐ */
	const ignoreNextScroll = (ms = 100) => {
		ignore.current = true;
		setTimeout(() => {
			ignore.current = false;
		}, ms);
	};

	useEffect(() => {
		if (alwaysVisible) {
			setVisible(true);
			return;
		}

		const apply = (cur: number) => {
			const dir = cur - lastY.current; // +down / –up
			// ② 上スクロール or 最上部近くなら表示
			const next = dir <= 0 || cur < window.innerHeight * 0.03;

			if (next !== visibleRef.current) {
				visibleRef.current = next;
				setVisible(next);
			}

			lastY.current = cur;
		};

		const unsubscribe = subscribeScrollY((scrollY) => {
			if (ignore.current) return;
			latestY.current = scrollY;
			if (ticking.current) return;

			ticking.current = true;
			requestAnimationFrame(() => {
				ticking.current = false;
				apply(latestY.current);
			});
		});

		return () => unsubscribe();
	}, [alwaysVisible]);

	return { isVisible, ignoreNextScroll };
}
