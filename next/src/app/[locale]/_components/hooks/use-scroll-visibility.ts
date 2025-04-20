/* app/_hooks/use-scroll-visibility.ts */
import { useCallback, useRef, useState } from "react";

export function useScrollVisibility(alwaysVisible = false) {
	const [isVisible, setVisible] = useState(alwaysVisible);
	const lastY = useRef(0);
	const ignore = useRef(false);

	const ignoreNextScroll = (ms = 100) => {
		ignore.current = true;
		setTimeout(() => {
			ignore.current = false;
		}, ms);
	};

	const onScroll = useCallback(() => {
		if (alwaysVisible) return setVisible(true);
		if (ignore.current) return;

		const cur = window.scrollY;
		const dir = cur - lastY.current; // +down / –up
		setVisible(dir <= 0 || cur < window.innerHeight * 0.03);
		lastY.current = cur;
	}, [alwaysVisible]);

	return { isVisible, onScroll, ignoreNextScroll };
}
