import { useEffect, useRef, useState } from "react";
import { subscribeScrollY } from "./scroll-y-store";

export function useHeaderScroll() {
	const scrollThreshold = 5;
	const [isPinned, setIsPinned] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const headerRef = useRef<HTMLDivElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);

	// スクロールは高頻度なので、スクロール量などは state にせず ref で保持し、
	// state 更新は「表示/固定」が切り替わったときだけに絞る。
	const lastScrollYRef = useRef(0);
	const isPinnedRef = useRef(false);
	const isVisibleRef = useRef(true);

	const rafIdRef = useRef<number | null>(null);
	const latestScrollYRef = useRef<number>(0);

	useEffect(() => {
		// 初期状態を揃える
		lastScrollYRef.current = window.scrollY;
		latestScrollYRef.current = window.scrollY;
	}, []);

	useEffect(() => {
		const measureHeader = () => {
			if (!headerRef.current) return;

			setHeaderHeight(headerRef.current.offsetHeight);
		};

		measureHeader();

		// ヘッダーの高さが変わる場合に追従（メニュー展開など）
		if (!headerRef.current || typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver(() => {
			if (!headerRef.current) return;
			setHeaderHeight(headerRef.current.offsetHeight);
		});
		ro.observe(headerRef.current);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const applyScrollState = (currentScrollY: number) => {
			const last = lastScrollYRef.current;

			const isScrollingDown = currentScrollY > last;
			const isScrollingUp = currentScrollY < last;
			const scrollDifference = Math.abs(currentScrollY - last);

			let nextPinned = isPinnedRef.current;
			let nextVisible = isVisibleRef.current;

			if (currentScrollY <= 0) {
				nextPinned = false;
				nextVisible = true;
			} else if (isScrollingDown && scrollDifference > scrollThreshold) {
				nextVisible = false;
				nextPinned = false;
			} else if (isScrollingUp && scrollDifference > scrollThreshold) {
				nextVisible = true;
				nextPinned = true;
			}

			if (nextPinned !== isPinnedRef.current) {
				isPinnedRef.current = nextPinned;
				setIsPinned(nextPinned);
			}
			if (nextVisible !== isVisibleRef.current) {
				isVisibleRef.current = nextVisible;
				setIsVisible(nextVisible);
			}

			lastScrollYRef.current = currentScrollY;
		};

		const unsubscribe = subscribeScrollY((scrollY) => {
			latestScrollYRef.current = scrollY;
			if (rafIdRef.current !== null) return;

			rafIdRef.current = window.requestAnimationFrame(() => {
				rafIdRef.current = null;
				applyScrollState(latestScrollYRef.current);
			});
		});

		return () => {
			unsubscribe();
			if (rafIdRef.current !== null) {
				window.cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

	return {
		headerRef,
		isPinned,
		isVisible,
		headerHeight,
	};
}
