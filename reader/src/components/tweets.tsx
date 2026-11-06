import { type ReactPortal, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function TweetsIsland() {
	const [tweets, setTweets] = useState<ReactPortal[]>([]);
	useEffect(() => {
		const roots = Array.from(
			document.querySelectorAll<HTMLElement>("[data-tweet-id]"),
		);
		if (roots.length === 0) return;
		let cancelled = false;
		void import("react-tweet").then(({ Tweet }) => {
			if (!cancelled)
				setTweets(
					roots.map((root, index) =>
						createPortal(
							<Tweet id={root.dataset.tweetId ?? ""} />,
							root,
							String(index),
						),
					),
				);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	return tweets;
}
