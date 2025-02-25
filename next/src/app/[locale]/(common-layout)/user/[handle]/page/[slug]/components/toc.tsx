"use client";
import { useEffect } from "react";
import * as tocbot from "tocbot";
import "tocbot/dist/tocbot.css";

export default function TableOfContents({
	onItemClick,
}: { onItemClick: () => void }) {
	useEffect(() => {
		// tocbotの初期化
		tocbot.init({
			tocSelector: ".js-toc",
			contentSelector: ".js-content",
			headingSelector: "h1, h2, h3",
			collapseDepth: 10,
			orderedList: false,
			headingLabelCallback: (text) => {
				// 10文字以上の場合は10文字に切り詰めて「...」を追加
				return text.length > 10 ? `${text.substring(0, 20)}...` : text;
			},
			onClick: (e) => {
				// TOCアイテムがクリックされたときにコールバックを呼び出す
				if (onItemClick) {
					onItemClick();
				}
			},
		});

		// コンポーネントのアンマウント時にリソースを解放
		return () => {
			tocbot.destroy();
		};
	}, [onItemClick]);
	return <nav className="js-toc" />;
}
