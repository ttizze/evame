import type { Root } from "react-dom/client";
import { subscribeTranslationForm } from "../../../shared/translation-form-events";

class Translations extends HTMLElement {
	private unsubscribe: (() => void) | null = null;
	private root: Root | null = null;
	private active: Parameters<
		Parameters<typeof subscribeTranslationForm>[0]
	>[0] = null;

	connectedCallback() {
		this.unsubscribe = subscribeTranslationForm(async (active) => {
			this.root?.unmount();
			this.root = null;
			this.active = active;
			if (!active) return;
			active.rootEl.setAttribute("aria-busy", "true");
			try {
				const { mountTranslation } = await import("./translations");
				if (this.active === active && this.isConnected)
					this.root = mountTranslation(
						active.rootEl,
						active.segmentId,
						this.dataset.locale!,
						this.dataset.search ?? "",
					);
			} catch {
				// 次の操作で再試行できるよう、本文とフォームの配置は維持する。
			} finally {
				active.rootEl.removeAttribute("aria-busy");
			}
		});
	}

	disconnectedCallback() {
		this.unsubscribe?.();
		this.root?.unmount();
		this.root = null;
		this.active = null;
	}
}

customElements.define("evame-translations", Translations);
