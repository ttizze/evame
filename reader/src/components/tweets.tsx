import { createRoot } from "react-dom/client";
import { Tweet } from "react-tweet";

export function renderTweets(roots: HTMLElement[]) {
	for (const container of roots)
		if (container.isConnected)
			createRoot(container).render(<Tweet id={container.dataset.tweetId!} />);
}
