import { callReaderAction } from "@/app/_service/reader-action";
import type {
	LikeState,
	LikeStatesResponse,
} from "@/app/api/page-likes/_types/like-state";
import { computeNextLikeState } from "../../../shared/like-state";

class PageLikes extends HTMLElement {
	private controller: AbortController | null = null;
	private states = new Map<number, LikeState & { pending: boolean }>();
	private observer: MutationObserver | null = null;

	connectedCallback() {
		this.addEventListener("click", this.toggleLike);
		this.observer = new MutationObserver((records) => {
			if (
				!records.some((record) =>
					[...record.addedNodes].some(
						(node) =>
							node instanceof Element &&
							(node.matches("[data-like-page],[data-like-count]") ||
								node.querySelector("[data-like-page],[data-like-count]")),
					),
				)
			)
				return;
			for (const [id, state] of this.states)
				this.update(id, state, state.pending);
		});
		this.observer.observe(this, { childList: true, subtree: true });
		void this.load();
	}

	disconnectedCallback() {
		this.controller?.abort();
		this.observer?.disconnect();
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
				this.states.set(Number(id), { ...state, pending: false });
			}
		} catch {
			// 取得に失敗しても、ボタンから状態を取得し直して操作できる。
		} finally {
			if (!controller.signal.aborted) {
				for (const id of ids.split(",").map(Number)) {
					this.update(
						id,
						this.states.get(id) ?? {
							liked: false,
							likeCount: Number(
								this.querySelector(`[data-like-count="${id}"]`)?.textContent ??
									0,
							),
						},
						false,
					);
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
		const previous = this.states.get(pageId)!;
		this.update(pageId, computeNextLikeState(previous), true);
		try {
			const result = await callReaderAction("like", { pageId });
			this.update(pageId, result.success ? result.data : previous, false);
		} catch {
			this.update(pageId, previous, false);
		}
	};

	private update(pageId: number, state: LikeState, pending: boolean) {
		this.states.set(pageId, { ...state, pending });
		for (const button of this.querySelectorAll<HTMLButtonElement>(
			`[data-like-page="${pageId}"]`,
		)) {
			button.disabled = pending;
			button.setAttribute("aria-pressed", String(state.liked));
			const heart = button.querySelector("[data-like-heart]");
			heart?.setAttribute("fill", state.liked ? "currentColor" : "none");
			heart?.classList.toggle("text-red-500", state.liked);
			heart?.toggleAttribute("hidden", pending);
			button
				.querySelector("[data-like-pending]")
				?.toggleAttribute("hidden", !pending);
		}
		for (const count of this.querySelectorAll(`[data-like-count="${pageId}"]`))
			if (count.textContent !== String(state.likeCount))
				count.textContent = String(state.likeCount);
	}
}

customElements.define("evame-page-likes", PageLikes);
