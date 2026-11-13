class UserAvatar extends HTMLElement {
	private observer: MutationObserver | null = null;

	connectedCallback() {
		this.addEventListener("load", this.updateImage, true);
		this.addEventListener("error", this.updateImage, true);
		const image = this.querySelector("img");
		if (image) {
			this.observer = new MutationObserver(this.updateImage);
			this.observer.observe(image, {
				attributes: true,
				attributeFilter: ["src"],
			});
		}
		this.updateImage();
	}

	disconnectedCallback() {
		this.removeEventListener("load", this.updateImage, true);
		this.removeEventListener("error", this.updateImage, true);
		this.observer?.disconnect();
	}

	private updateImage = () => {
		const image = this.querySelector("img");
		const fallback = this.querySelector("span");
		if (!image || !fallback) return;
		const loaded = image.complete && image.naturalWidth > 0;
		// 読み込み中のlazy画像はレイアウトに残し、取得を止めない。
		image.hidden = !image.getAttribute("src") || (image.complete && !loaded);
		image.style.opacity = loaded ? "1" : "0";
		fallback.hidden = loaded;
		fallback.setAttribute("aria-hidden", String(loaded));
	};
}

customElements.define("evame-avatar", UserAvatar);
