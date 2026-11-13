import { callReaderAction } from "@/app/_service/reader-action";
import type { LikeStatesResponse } from "@/app/api/page-likes/_types/like-state";

class PageLikes extends HTMLElement {
	private controller: AbortController | null = null;
	private states = new Map<number, boolean>();

	connectedCallback() {
		this.addEventListener("click", this.toggleLike);
		void this.load();
	}

	disconnectedCallback() {
		this.controller?.abort();
		this.removeEventListener("click", this.toggleLike);
	}

	private async load() {
		const ids = this.dataset.pageIds;
		if (!ids) return;
		const controller = new AbortController();
		this.controller = controller;
		try {
			const response = await fetch(`/api/page-likes/state?ids=${ids}`, {
				credentials: "include",
				signal: controller.signal,
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = (await response.json()) as LikeStatesResponse;
			if (controller.signal.aborted) return;
			for (const [id, state] of Object.entries(data.states)) {
				this.states.set(Number(id), state.liked);
			}
		} catch {
			// 取得に失敗しても、ボタンから状態を取得し直して操作できる。
		} finally {
			if (!controller.signal.aborted) {
				for (const button of this.querySelectorAll<HTMLButtonElement>(
					"[data-like-page]",
				)) {
					const id = Number(button.dataset.likePage);
					this.update(id, this.states.get(id) ?? false, false);
				}
			}
		}
	}

	private toggleLike = async (event: MouseEvent) => {
		const button = (event.target as Element).closest<HTMLButtonElement>(
			"[data-like-page]",
		);
		if (!button || button.disabled) return;
		const pageId = Number(button.dataset.likePage);
		const previous = this.states.get(pageId) ?? false;
		this.update(pageId, !previous, true);
		try {
			const result = await callReaderAction("like", { pageId });
			this.update(pageId, result.success ? result.data.liked : previous, false);
		} catch {
			this.update(pageId, previous, false);
		}
	};

	private update(pageId: number, liked: boolean, pending: boolean) {
		this.states.set(pageId, liked);
		for (const button of this.querySelectorAll<HTMLButtonElement>(
			`[data-like-page="${pageId}"]`,
		)) {
			button.disabled = pending;
			button.setAttribute("aria-pressed", String(liked));
			const heart = button.querySelector("[data-like-heart]");
			heart?.setAttribute("fill", liked ? "currentColor" : "none");
			heart?.classList.toggle("text-red-500", liked);
			heart?.toggleAttribute("hidden", pending);
			button
				.querySelector("[data-like-pending]")
				?.toggleAttribute("hidden", !pending);
		}
	}
}

customElements.define("evame-page-likes", PageLikes);
