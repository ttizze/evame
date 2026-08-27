"use client";

import { useEffect, useRef, useState } from "react";

/** 読み込み時に表示し、下スクロールで隠し、上スクロールで再表示する。 */
export function useScrollVisibility(alwaysVisible = false) {
	const [isVisible, setIsVisible] = useState(true);
	const lastScrollY = useRef(0);
	const ignore = useRef(false);

	function ignoreNextScroll(duration = 100) {
		ignore.current = true;
		globalThis.setTimeout(() => {
			ignore.current = false;
		}, duration);
	}

	useEffect(() => {
		if (alwaysVisible) {
			setIsVisible(true);
			return;
		}

		const handleScroll = () => {
			if (ignore.current) return;
			const currentScrollY = window.scrollY;
			const next =
				currentScrollY <= window.innerHeight * 0.03 ||
				currentScrollY <= lastScrollY.current;
			lastScrollY.current = currentScrollY;
			setIsVisible(next);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [alwaysVisible]);

	return { isVisible, ignoreNextScroll };
}
