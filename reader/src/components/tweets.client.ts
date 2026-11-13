const roots = [...document.querySelectorAll<HTMLElement>("[data-tweet-id]")];
if (roots.length > 0) {
	const observer = new IntersectionObserver(
		(entries) => {
			const visible = [
				...new Set(
					entries
						.filter((entry) => entry.isIntersecting)
						.map((entry) => entry.target as HTMLElement),
				),
			];
			if (visible.length === 0) return;
			for (const root of visible) observer.unobserve(root);
			void import("./tweets")
				.then(({ renderTweets }) => renderTweets(visible))
				.catch(() => {});
		},
		{ rootMargin: "200px" },
	);
	for (const root of roots) observer.observe(root);
}

export {};
