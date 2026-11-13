import { subscribeScrollY } from "@/app/[locale]/(common-layout)/_components/header/hooks/scroll-y-store";
import { headerScrollState } from "../../../shared/header-scroll-state";

class HeaderScroll extends HTMLElement {
	private unsubscribe: (() => void) | null = null;
	private observer: ResizeObserver | null = null;
	private header: HTMLElement | null = null;
	private space: HTMLDivElement | null = null;
	private lastY = 0;
	private pinned = false;
	private visible = true;

	connectedCallback() {
		const header = this.querySelector("header");
		if (!header) return;
		this.header = header;
		this.space = document.createElement("div");
		this.space.hidden = true;
		header.after(this.space);
		if (typeof ResizeObserver !== "undefined") {
			this.observer = new ResizeObserver(() => {
				if (this.space) this.space.style.height = `${header.offsetHeight}px`;
			});
			this.observer.observe(header);
		}
		this.space.style.height = `${header.offsetHeight}px`;
		this.lastY = window.scrollY;
		this.unsubscribe = subscribeScrollY(this.onScroll);
	}

	disconnectedCallback() {
		this.unsubscribe?.();
		this.observer?.disconnect();
		this.space?.remove();
		this.header = null;
		this.space = null;
	}

	private onScroll = (current: number) => {
		const header = this.header;
		if (!header) return;
		const state = headerScrollState(
			current,
			this.lastY,
			header.parentElement!.getBoundingClientRect().top,
			this.pinned,
			this.visible,
		);
		this.lastY = current;
		this.pinned = state.pinned;
		this.visible = state.visible;
		header.classList.toggle("-translate-y-full", !state.visible);
		header.classList.toggle("translate-y-0", state.visible);
		for (const name of [
			"fixed",
			"top-0",
			"left-0",
			"right-0",
			"shadow-md",
			"dark:shadow-gray-900",
		])
			header.classList.toggle(name, state.pinned);
		if (this.space) this.space.hidden = !state.pinned;
	};
}

customElements.define("evame-header-scroll", HeaderScroll);
