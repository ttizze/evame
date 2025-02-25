"use client";
import { useEffect, useRef } from "react";
import * as tocbot from "tocbot";
import "tocbot/dist/tocbot.css";

export default function TableOfContents({
	onItemClick,
}: { onItemClick: () => void }) {
	const tocInitialized = useRef(false);

	useEffect(() => {
		// Wait for content to be fully rendered
		const initTocbot = () => {
			// Check if content exists before initializing
			if (document.querySelector('.js-content') && !tocInitialized.current) {
				tocbot.init({
					tocSelector: ".js-toc",
					contentSelector: ".js-content",
					headingSelector: "h1, h2, h3",
					collapseDepth: 10,
					orderedList: false,
					hasInnerContainers: true, // Handle nested containers
					headingLabelCallback: (text) => {
						// 20文字以上の場合は20文字に切り詰めて「...」を追加
						return text.length > 20 ? `${text.substring(0, 20)}...` : text;
					},
					onClick: (e) => {
						// TOCアイテムがクリックされたときにコールバックを呼び出す
						if (onItemClick) {
							onItemClick();
						}
					},
					scrollSmoothOffset: -70, // Adjust based on your header height
				});
				tocInitialized.current = true;
			}
		};

		// Try initializing after a short delay to ensure content is rendered
		const timer = setTimeout(initTocbot, 300);

		// コンポーネントのアンマウント時にリソースを解放
		return () => {
			clearTimeout(timer);
			if (tocInitialized.current) {
				tocbot.destroy();
				tocInitialized.current = false;
			}
		};
	}, [onItemClick]);

	return <nav className="js-toc" />;
}