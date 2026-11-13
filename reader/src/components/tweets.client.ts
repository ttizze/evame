const roots = [...document.querySelectorAll<HTMLElement>("[data-tweet-id]")];
if (roots.length > 0)
	void import("./tweets")
		.then(({ renderTweets }) => renderTweets(roots))
		.catch(() => {});
