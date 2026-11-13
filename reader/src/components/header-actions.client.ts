import type { Root } from "react-dom/client";
import type { loadReaderHeader } from "@/app/api/reader-header/_service/load-reader-header";
import { generateSlug } from "../../../shared/generate-slug";

class HeaderActions extends HTMLElement {
	private lifetime: AbortController | null = null;
	private data:
		| (Awaited<ReturnType<typeof loadReaderHeader>>["data"] & {
				unreadDescription: string;
		  })
		| null = null;
	private version = "";
	private loading = false;
	private opening = false;
	private root: Root | null = null;
	private module: Promise<typeof import("./header-account")> | null = null;

	connectedCallback() {
		this.lifetime = new AbortController();
		this.addEventListener("click", this.onClick, true);
		this.addEventListener("keydown", this.keydown, true);
		this.addEventListener("pointerover", this.warm, { passive: true });
		this.addEventListener("focusin", this.warm);
		window.addEventListener("focus", this.refresh);
		window.addEventListener("pageshow", this.resetCreate);
		void this.refresh();
	}

	disconnectedCallback() {
		this.lifetime?.abort();
		this.root?.unmount();
		this.root = null;
		this.data = null;
		this.version = "";
		this.loading = false;
		this.opening = false;
		this.removeEventListener("click", this.onClick, true);
		this.removeEventListener("keydown", this.keydown, true);
		this.removeEventListener("pointerover", this.warm);
		this.removeEventListener("focusin", this.warm);
		window.removeEventListener("focus", this.refresh);
		window.removeEventListener("pageshow", this.resetCreate);
	}

	private refresh = async () => {
		const signal = this.lifetime?.signal;
		const locale = this.dataset.locale;
		if (
			!signal ||
			signal.aborted ||
			!locale ||
			this.loading ||
			this.opening ||
			document.hidden ||
			document.querySelector('[role="dialog"],[role="menu"]')
		)
			return;
		this.loading = true;
		try {
			const response = await fetch(
				`/api/reader-header?${new URLSearchParams({ locale })}`,
				{ credentials: "include", signal },
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = (await response.json()) as NonNullable<
				HeaderActions["data"]
			>;
			if (signal.aborted || !this.isConnected) return;
			const version = JSON.stringify(data);
			if (version === this.version) return;
			this.version = version;
			this.data = data;
			this.root?.unmount();
			this.root = null;
			const account = this.querySelector<HTMLElement>(
				"[data-header-account-root]",
			)!;
			const guest = this.querySelector<HTMLElement>("[data-header-guest]")!;
			this.querySelector<HTMLElement>("[data-header-loading]")!.hidden = true;
			guest.hidden = data.user !== null;
			account.hidden = data.user === null;
			if (data.user) {
				const template = this.querySelector<HTMLTemplateElement>(
					"[data-header-account-template]",
				)!;
				account.replaceChildren(template.content.cloneNode(true));
				account.querySelector<HTMLButtonElement>(
					"[data-create-page]",
				)!.dataset.createPage = data.user.handle;
				const button = account.querySelector<HTMLButtonElement>(
					"[data-header-account]",
				)!;
				const avatar = button.querySelector("evame-avatar")!;
				const fallback = avatar.querySelector("span")!;
				fallback.textContent = data.user.handle.charAt(0).toUpperCase();
				const image = avatar.querySelector("img")!;
				if (data.user.image) {
					image.hidden = false;
					image.style.opacity = "0";
					image.alt = data.user.handle;
					image.src = data.user.image;
				}
				const badge = button.querySelector<HTMLElement>(
					'[data-testid="unread-count"]',
				)!;
				badge.hidden = data.unreadCount === 0;
				badge.textContent =
					data.unreadCount > 99 ? "99+" : String(data.unreadCount);
				const description = button.querySelector<HTMLElement>(
					"[data-unread-description]",
				)!;
				description.hidden = data.unreadCount === 0;
				description.textContent = data.unreadDescription;
				if (data.unreadCount > 0)
					button.setAttribute("aria-describedby", description.id);
			}
		} catch {
			if (!signal.aborted && !this.data) {
				this.querySelector<HTMLElement>("[data-header-loading]")!.hidden = true;
				this.querySelector<HTMLElement>("[data-header-guest]")!.hidden = false;
			}
		} finally {
			if (this.lifetime?.signal === signal) this.loading = false;
		}
	};

	private warm = (event: Event) => {
		if (!(event.target as Element).closest("[data-header-account]")) return;
		this.module ??= import("./header-account");
		void this.module.catch(() => {
			this.module = null;
		});
	};

	private onClick = (event: MouseEvent) => {
		const target = event.target as Element;
		const create = target.closest<HTMLButtonElement>("[data-create-page]");
		if (create) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (create.disabled) return;
			create.disabled = true;
			create.querySelector("[data-create-icon]")?.setAttribute("hidden", "");
			create.querySelector("[data-create-pending]")?.removeAttribute("hidden");
			window.location.assign(
				`/${create.dataset.createLocale}/${create.dataset.createPage}/${generateSlug()}/edit`,
			);
			return;
		}
		const button = target.closest<HTMLButtonElement>("[data-header-account]");
		if (button) {
			event.preventDefault();
			event.stopImmediatePropagation();
			void this.openAccount(button, null);
		}
	};

	private keydown = (event: KeyboardEvent) => {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
		const button = (event.target as Element).closest<HTMLButtonElement>(
			"[data-header-account]",
		);
		if (!button) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		void this.openAccount(button, event.key);
	};

	private async openAccount(button: HTMLButtonElement, key: string | null) {
		const signal = this.lifetime?.signal;
		const user = this.data?.user;
		if (!signal || !user || this.opening) return;
		this.opening = true;
		button.disabled = true;
		button.setAttribute("aria-busy", "true");
		try {
			this.module ??= import("./header-account");
			const { mountAccountHeader } = await this.module;
			if (signal.aborted || !this.isConnected) return;
			this.root = mountAccountHeader(
				this.querySelector<HTMLElement>("[data-header-account-root]")!,
				user,
				this.data!.unreadCount,
				this.dataset.locale!,
				this.dataset.search ?? "",
			);
			if (key)
				document.querySelector<HTMLElement>('[role="menu"]')?.dispatchEvent(
					new KeyboardEvent("keydown", {
						key,
						bubbles: true,
						cancelable: true,
					}),
				);
		} catch {
			this.module = null;
			if (button.isConnected) button.focus();
		} finally {
			button.disabled = false;
			button.removeAttribute("aria-busy");
			if (this.lifetime?.signal === signal) this.opening = false;
		}
	}

	private resetCreate = () => {
		for (const button of this.querySelectorAll<HTMLButtonElement>(
			"[data-create-page]",
		)) {
			button.disabled = false;
			button.querySelector("[data-create-icon]")?.removeAttribute("hidden");
			button.querySelector("[data-create-pending]")?.setAttribute("hidden", "");
		}
	};
}

customElements.define("evame-header-actions", HeaderActions);
