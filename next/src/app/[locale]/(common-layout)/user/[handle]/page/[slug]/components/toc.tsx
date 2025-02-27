"use client";
import { useEffect, useState } from "react";
import * as tocbot from "tocbot";
import "tocbot/dist/tocbot.css";

export default function TableOfContents({
	onItemClick,
}: { onItemClick: () => void }) {
	useEffect(() => {
		if (!document.querySelector(".js-content")) {
			return;
		}

		tocbot.init({
			tocSelector: ".js-toc",
			contentSelector: ".js-content",
			headingSelector: "h1, h2, h3",
			collapseDepth: 10,
			orderedList: false,
			hasInnerContainers: true,
			headingLabelCallback: (text) => {
				return text.length > 40 ? `${text.substring(0, 40)}...` : text;
			},
			onClick: (e) => {
				if (onItemClick) {
					onItemClick();
				}
			},
			scrollSmoothOffset: -70,
		});

		// Add custom styling for the TOC with a unique ID
		const style = document.createElement("style");
		style.id = "toc-custom-style";
		style.innerHTML = `
			.toc-link {
				white-space: pre-wrap;
			}
		`;
		document.head.appendChild(style);

		// Clean up on unmount
		return () => {
			tocbot.destroy();
		};
	}, [onItemClick]);

	return <nav className="js-toc" />;
}

export function useHasTableOfContents(): boolean {
	const [hasHeadings, setHasHeadings] = useState(false);

	useEffect(() => {
		const contentElement = document.querySelector(".js-content");
		if (!contentElement) {
			return;
		}

		const headings = contentElement.querySelectorAll("h1, h2, h3");
		setHasHeadings(headings.length > 0);
	}, []);

	return hasHeadings;
}
