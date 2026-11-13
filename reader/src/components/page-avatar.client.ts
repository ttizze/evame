class PageAvatar extends HTMLElement {
	connectedCallback() {
		this.addEventListener("load", this.updateImage, true);
		this.addEventListener("error", this.updateImage, true);
		if (this.querySelector("img")?.complete) this.updateImage();
	}

	disconnectedCallback() {
		this.removeEventListener("load", this.updateImage, true);
		this.removeEventListener("error", this.updateImage, true);
	}

	private updateImage = () => {
		const image = this.querySelector("img");
		const fallback = this.querySelector("span");
		if (!image || !fallback) return;
		image.hidden = image.naturalWidth === 0;
		image.style.opacity = image.hidden ? "0" : "1";
		fallback.hidden = !image.hidden;
		fallback.setAttribute("aria-hidden", String(!image.hidden));
	};
}

customElements.define("evame-page-avatar", PageAvatar);
