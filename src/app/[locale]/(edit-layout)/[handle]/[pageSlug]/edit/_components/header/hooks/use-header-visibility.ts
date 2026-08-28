import { useEffect, useState } from "react";

export function useHeaderVisibility() {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		const container = document.getElementById("root");
		if (!container) return;

		const handleScroll = () => {
			const currentScrollY = container.scrollTop;
			setIsVisible(currentScrollY < lastScrollY || currentScrollY < 10);
			setLastScrollY(currentScrollY);
		};

		container.addEventListener("scroll", handleScroll, { passive: true });
		return () => container.removeEventListener("scroll", handleScroll);
	}, [lastScrollY]);

	return { isVisible };
}
