import { supportedLocaleOptions } from "@/app/_constants/locale";
import { buildLocaleOptions } from "@/app/[locale]/(common-layout)/_components/header/locale-selector/domain/build-locale-options";
import type { fetchLocaleInfoByPageSlug } from "@/app/api/locale-info/_db/queries.server";

class LocaleStatus extends HTMLElement {
	private controller: AbortController | null = null;
	private loading = false;

	connectedCallback() {
		this.controller = new AbortController();
		window.addEventListener("focus", this.refresh);
		window.addEventListener("online", this.refresh);
		document.addEventListener("visibilitychange", this.refresh);
		void this.refresh();
	}

	disconnectedCallback() {
		this.controller?.abort();
		this.loading = false;
		window.removeEventListener("focus", this.refresh);
		window.removeEventListener("online", this.refresh);
		document.removeEventListener("visibilitychange", this.refresh);
	}

	private refresh = async () => {
		const signal = this.controller?.signal;
		if (!signal || signal.aborted || this.loading || document.hidden) return;
		this.loading = true;
		try {
			const response = await fetch(
				`/api/locale-info?${new URLSearchParams({ pageSlug: this.dataset.pageSlug! })}`,
				{ cache: "no-store", signal },
			);
			if (!response.ok) return;
			const data = (await response.json()) as NonNullable<
				Awaited<ReturnType<typeof fetchLocaleInfoByPageSlug>>
			>;
			if (signal.aborted) return;
			const selected = buildLocaleOptions({
				sourceLocale: data.sourceLocale,
				existLocales: data.translationJobs.map((job) => job.locale),
				supported: supportedLocaleOptions,
				proofStatusMap: Object.fromEntries(
					data.translationProofs.map((proof) => [
						proof.locale,
						proof.translationProofStatus,
					]),
				),
			}).find((option) => option.code === this.dataset.locale);
			if (!selected) return;
			const status =
				selected.status === "translated"
					? (selected.proofStatus ?? "MACHINE_DRAFT")
					: selected.status;
			const template = this.querySelector<HTMLTemplateElement>(
				`template[data-locale-status="${status}"]`,
			);
			if (template)
				this.querySelector("[data-locale-status-icon]")!.replaceChildren(
					template.content.cloneNode(true),
				);
		} catch {
			// 通信失敗時も最後に取得できた状態を維持する。
		} finally {
			if (this.controller?.signal === signal) this.loading = false;
		}
	};
}

customElements.define("evame-locale-status", LocaleStatus);
