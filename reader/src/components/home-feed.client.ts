class HomeFeed extends HTMLElement {
	private timer: ReturnType<typeof setInterval> | null = null;
	private controller: AbortController | null = null;

	connectedCallback() {
		this.timer = setInterval(this.refresh, 30000);
		this.querySelector("[data-home-retry]")?.addEventListener(
			"click",
			this.refresh,
		);
		window.addEventListener("focus", this.refresh);
	}

	disconnectedCallback() {
		if (this.timer !== null) clearInterval(this.timer);
		this.controller?.abort();
		this.querySelector("[data-home-retry]")?.removeEventListener(
			"click",
			this.refresh,
		);
		window.removeEventListener("focus", this.refresh);
	}

	private refresh = async () => {
		if (this.controller || document.hidden) return;
		const pages = this.querySelector<HTMLElement>("[data-home-pages]");
		const error = this.querySelector<HTMLElement>("[data-home-error]");
		const locale = this.dataset.locale;
		if (!pages || !error || !locale || pages.contains(document.activeElement))
			return;
		const controller = new AbortController();
		this.controller = controller;
		this.setAttribute("aria-busy", "true");
		try {
			const response = await fetch(
				`/api/home-feed?${new URLSearchParams({ locale })}`,
				{ signal: controller.signal },
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const html = new DOMParser().parseFromString(
				await response.text(),
				"text/html",
			);
			const nextPages = html.querySelector<HTMLElement>("[data-home-pages]");
			if (!nextPages) throw new Error("Home feed is missing");
			if (!this.isConnected || controller.signal.aborted) return;
			if (
				!pages.contains(document.activeElement) &&
				(!pages.dataset.homeVersion ||
					pages.dataset.homeVersion !== nextPages.dataset.homeVersion)
			) {
				pages.replaceWith(document.importNode(nextPages, true));
			}
			error.hidden = true;
		} catch {
			if (!controller.signal.aborted) error.hidden = false;
		} finally {
			this.controller = null;
			this.setAttribute("aria-busy", "false");
		}
	};
}

customElements.define("evame-home-feed", HomeFeed);
