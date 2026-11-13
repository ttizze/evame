import { useEffect, useRef, useState } from "react";
import { headerScrollState } from "../../../../../../../shared/header-scroll-state";
import { subscribeScrollY } from "./scroll-y-store";

export function useHeaderScroll() {
	const [isPinned, setIsPinned] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const headerRef = useRef<HTMLDivElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);

	// スクロールは高頻度なので、スクロール量などは state にせず ref で保持し、
	// state 更新は「表示/固定」が切り替わったときだけに絞る。
	const lastScrollYRef = useRef(0);
	const isPinnedRef = useRef(false);
	const isVisibleRef = useRef(true);

	useEffect(() => {
		const measureHeader = () => {
			if (!headerRef.current) return;

			setHeaderHeight(headerRef.current.offsetHeight);
		};

		measureHeader();

		// ヘッダーの高さが変わる場合に追従（メニュー展開など）
		if (!headerRef.current || typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver(measureHeader);
		ro.observe(headerRef.current);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		lastScrollYRef.current = window.scrollY;
		const applyScrollState = (currentScrollY: number) => {
			const { pinned: nextPinned, visible: nextVisible } = headerScrollState(
				currentScrollY,
				lastScrollYRef.current,
				headerRef.current?.getBoundingClientRect().top ?? 0,
				isPinnedRef.current,
				isVisibleRef.current,
			);

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

		return subscribeScrollY(applyScrollState);
	}, []);

	return {
		headerRef,
		isPinned,
		isVisible,
		headerHeight,
	};
}
