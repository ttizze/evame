import { useEffect, useState } from "react";

export function useKeyboardVisible() {
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

	useEffect(() => {
		if (!navigator.userAgent.match(/iPad|iPhone/i) || !self.visualViewport)
			return;

		const root = document.getElementById("root");
		let lastHeight: number | undefined;
		let lastOffsetTop: number | undefined;

		const updateLayout = () => {
			const viewport = self.visualViewport;
			if (!viewport) return;
			const height = viewport.height * viewport.scale;
			const offsetTop = viewport.offsetTop;

			// Update height if changed
			if (lastHeight !== height) {
				lastHeight = height;
				requestAnimationFrame(() => {
					document.documentElement.style.setProperty(
						"--svh",
						`${height * 0.01}px`,
					);
				});
			}

			// Update offset if changed
			if (lastOffsetTop !== offsetTop) {
				const delta = offsetTop - (lastOffsetTop || 0);
				lastOffsetTop = offsetTop;
				requestAnimationFrame(() => {
					if (delta !== 0 && root) {
						root.scrollBy(0, delta);
					}
					document.documentElement.style.setProperty(
						"--visual-viewport-offset-top",
						`${offsetTop}px`,
					);
				});
			}

			// Toggle keyboard visibility
			const isKeyboard = height + 10 < document.documentElement.clientHeight;
			setIsKeyboardVisible(isKeyboard);
			document.body.classList.toggle("virtual-keyboard-shown", isKeyboard);
		};

		updateLayout();
		visualViewport?.addEventListener("resize", updateLayout);
		visualViewport?.addEventListener("scroll", updateLayout);

		return () => {
			visualViewport?.removeEventListener("resize", updateLayout);
			visualViewport?.removeEventListener("scroll", updateLayout);
		};
	}, []);

	return isKeyboardVisible;
}
