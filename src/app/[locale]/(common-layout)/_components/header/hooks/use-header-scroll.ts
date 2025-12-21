"use client";
import { type RefObject, useEffect, useRef, useState } from "react";

interface UseHeaderScrollOptions {
	// ヘッダーの初期オフセット位置（オプション、SubHeaderで使用）
	initialOffset?: number;
	// スクロールしきい値（小さな動きを無視する）
	scrollThreshold?: number;
}

interface UseHeaderScrollResult {
	// ヘッダーの参照
	headerRef: RefObject<HTMLDivElement | null>;
	// ヘッダーが固定されているか
	isPinned: boolean;
	// ヘッダーが表示されているか
	isVisible: boolean;
	// ヘッダーの高さ
	headerHeight: number;
	// ヘッダーの初期オフセット位置（SubHeaderで使用）
	headerOffset: number;
}

/**
 * ヘッダーのスクロール動作を管理するカスタムフック
 */
export function useHeaderScroll(
	options: UseHeaderScrollOptions = {},
): UseHeaderScrollResult {
	const { initialOffset, scrollThreshold = 5 } = options;

	const [isPinned, setIsPinned] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const headerRef = useRef<HTMLDivElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);
	const [headerOffset, setHeaderOffset] = useState(initialOffset || 0);

	// スクロールは高頻度なので、スクロール量などは state にせず ref で保持し、
	// state 更新は「表示/固定」が切り替わったときだけに絞る。
	const lastScrollYRef = useRef(0);
	const headerOffsetRef = useRef<number>(initialOffset ?? 0);
	const isPinnedRef = useRef(false);
	const isVisibleRef = useRef(true);
	const scrollThresholdRef = useRef(scrollThreshold);

	const rafIdRef = useRef<number | null>(null);
	const latestScrollYRef = useRef<number>(0);

	useEffect(() => {
		scrollThresholdRef.current = scrollThreshold;
	}, [scrollThreshold]);

	useEffect(() => {
		// 初期状態を揃える
		lastScrollYRef.current = window.scrollY;
		latestScrollYRef.current = window.scrollY;
	}, []);

	useEffect(() => {
		const measureHeader = () => {
			if (!headerRef.current) return;

			setHeaderHeight(headerRef.current.offsetHeight);

			// initialOffset があればそれを優先、無ければ DOM から一度だけ計測
			if (initialOffset !== undefined) {
				headerOffsetRef.current = initialOffset;
				setHeaderOffset(initialOffset);
				return;
			}

			const offsetTop =
				headerRef.current.getBoundingClientRect().top + window.scrollY;
			headerOffsetRef.current = offsetTop;
			setHeaderOffset(offsetTop);
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
	}, [initialOffset]);

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
			} else if (
				headerOffsetRef.current > 0 &&
				currentScrollY < headerOffsetRef.current
			) {
				nextPinned = false;
				nextVisible = true;
			} else if (
				isScrollingDown &&
				scrollDifference > scrollThresholdRef.current
			) {
				nextVisible = false;
				nextPinned = false;
			} else if (
				isScrollingUp &&
				scrollDifference > scrollThresholdRef.current
			) {
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

		const handleScroll = () => {
			latestScrollYRef.current = window.scrollY;
			if (rafIdRef.current !== null) return;

			rafIdRef.current = window.requestAnimationFrame(() => {
				rafIdRef.current = null;
				applyScrollState(latestScrollYRef.current);
			});
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
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
		headerOffset,
	};
}
