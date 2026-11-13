import { subscribeScrollY } from "@/app/[locale]/(common-layout)/_components/header/hooks/scroll-y-store";
import { floatingControlsVisible } from "../../../shared/floating-controls-visible";

class ReaderFloatingControls extends HTMLElement {
	private unsubscribe: (() => void) | null = null;
	private lastY = 0;
	private ignoreUntil = 0;

	connectedCallback() {
		this.lastY = window.scrollY;
		this.unsubscribe = subscribeScrollY((current) => {
			if (Date.now() < this.ignoreUntil) return;
			this.toggleAttribute(
				"data-hidden",
				!floatingControlsVisible(current, this.lastY, window.innerHeight),
			);
			this.lastY = current;
		});
		this.addEventListener("click", this.clicked, true);
	}

	disconnectedCallback() {
		this.unsubscribe?.();
		this.removeEventListener("click", this.clicked, true);
	}

	private clicked = () => {
		this.ignoreUntil = Date.now() + 100;
	};
}

customElements.define("evame-floating-controls", ReaderFloatingControls);
