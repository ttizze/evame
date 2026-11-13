class PageViews extends HTMLElement {
	private requested = false;

	connectedCallback() {
		if (this.requested) return;
		this.requested = true;
		void fetch(`/api/page-views/${this.dataset.pageId}/increment`, {
			method: "POST",
			credentials: "include",
			keepalive: true,
			headers: { "Content-Type": "application/json" },
		})
			.then(async (response) => {
				if (!response.ok) return;
				const data = (await response.json()) as { count?: number };
				if (typeof data.count === "number")
					this.textContent = String(data.count);
			})
			.catch(() => {});
	}
}

customElements.define("evame-page-views", PageViews);

export {};
