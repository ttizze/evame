import {
	autoUpdate,
	computePosition,
	flip,
	limitShift,
	offset,
	shift,
} from "@floating-ui/dom";

class ReaderToc extends HTMLElement {
	private popup: HTMLElement | null = null;
	private stopPositioning: (() => void) | null = null;
	private events: AbortController | null = null;

	connectedCallback() {
		this.querySelector("button")?.addEventListener("click", this.toggle);
	}

	disconnectedCallback() {
		const trigger = this.querySelector("button");
		trigger?.removeEventListener("click", this.toggle);
		trigger?.setAttribute("aria-expanded", "false");
		trigger?.setAttribute("data-state", "closed");
		this.removePopup();
	}

	private removePopup() {
		this.events?.abort();
		this.events = null;
		this.stopPositioning?.();
		this.stopPositioning = null;
		this.popup?.remove();
		this.popup = null;
	}

	private close(restoreFocus: boolean) {
		const popup = this.popup;
		const panel = popup?.querySelector<HTMLElement>('[role="dialog"]');
		if (!panel) return;
		const trigger = this.querySelector("button");
		trigger?.setAttribute("aria-expanded", "false");
		trigger?.setAttribute("data-state", "closed");
		panel.dataset.state = "closed";
		this.events?.abort();
		const finishClose = () => {
			if (this.popup !== popup || panel.dataset.state !== "closed") return;
			this.removePopup();
			if (restoreFocus) trigger?.focus({ preventScroll: true });
		};
		const animations = panel.getAnimations?.() ?? [];
		if (animations.length === 0) finishClose();
		else {
			void Promise.allSettled(
				animations.map((animation) => animation.finished),
			).then(() => {
				if (
					!panel
						.getAnimations()
						.some((animation) => animation.playState === "running")
				)
					finishClose();
			});
		}
	}

	private toggle = () => {
		const trigger = this.querySelector("button");
		const anchor = this.querySelector<HTMLElement>("[data-reader-toc-anchor]");
		if (!trigger || !anchor) return;
		if (trigger.getAttribute("aria-expanded") === "true") {
			this.close(true);
			return;
		}
		if (!this.popup) {
			const template = this.querySelector("template");
			const popup = template?.content.firstElementChild?.cloneNode(true);
			if (!(popup instanceof HTMLElement)) return;
			this.popup = popup;
			document.body.append(popup);
		}
		const popup = this.popup;
		const panel = popup.querySelector<HTMLElement>('[role="dialog"]');
		if (!panel) return;
		panel.dataset.state = "open";
		trigger.setAttribute("aria-expanded", "true");
		trigger.dataset.state = "open";
		popup.style.zIndex = getComputedStyle(panel).zIndex;
		this.events = new AbortController();
		const { signal } = this.events;
		const dismissOutside = (event: Event) => {
			if (
				event.target instanceof Node &&
				!this.contains(event.target) &&
				!popup.contains(event.target)
			)
				this.close(false);
		};
		document.addEventListener(
			"pointerdown",
			(event) => {
				if (
					event.target instanceof Node &&
					!this.contains(event.target) &&
					!popup.contains(event.target)
				) {
					if (event.button === 0)
						document.addEventListener("click", dismissOutside, {
							once: true,
							signal,
						});
					else this.close(false);
				} else document.removeEventListener("click", dismissOutside);
			},
			{ signal },
		);
		document.addEventListener(
			"keydown",
			(event) => {
				const active = document.activeElement;
				if (event.key === "Escape") {
					if (
						active instanceof Element &&
						active.closest('[role="dialog"],[role="menu"]') &&
						!panel.contains(active)
					)
						return;
					event.preventDefault();
					this.close(true);
				} else if (event.key === "Tab" && panel.contains(active)) {
					const candidates = Array.from(
						panel.querySelectorAll<HTMLElement>(
							"a[href],button,summary,[tabindex]",
						),
					).filter(
						(element) =>
							element.tabIndex >= 0 && element.getClientRects().length > 0,
					);
					const first = candidates[0];
					const last = candidates.at(-1);
					if (
						(event.shiftKey && active === first) ||
						(!event.shiftKey && active === last)
					) {
						event.preventDefault();
						(event.shiftKey ? last : first)?.focus();
					}
				}
			},
			{ signal },
		);
		if (this.stopPositioning) return;
		this.stopPositioning = autoUpdate(anchor, popup, () => {
			void computePosition(anchor, popup, {
				strategy: "fixed",
				placement: "bottom-end",
				middleware: [
					offset({ mainAxis: 4, alignmentAxis: 0 }),
					shift({
						mainAxis: true,
						crossAxis: false,
						limiter: limitShift(),
						boundary: [],
						padding: 0,
					}),
					flip({ boundary: [], padding: 0 }),
				],
			}).then(({ x, y, placement }) => {
				if (this.popup !== popup) return;
				const ratio = window.devicePixelRatio || 1;
				popup.style.transform = `translate(${Math.round(x * ratio) / ratio}px, ${Math.round(y * ratio) / ratio}px)`;
				if (ratio >= 1.5) popup.style.willChange = "transform";
				panel.dataset.side = placement.split("-")[0];
				panel.dataset.align = "end";
				if (panel.style.animation && panel.dataset.state === "open") {
					panel.style.animation = "";
					(panel.querySelector<HTMLElement>("summary") ?? panel).focus({
						preventScroll: true,
					});
				}
			});
		});
	};
}

customElements.define("evame-toc", ReaderToc);
