import type { ClientDirective } from "astro";

const interaction: ClientDirective = (load, _options, element) => {
	let module: ReturnType<typeof load> | null = null;
	let activation: Promise<boolean> | null = null;

	const dispose = () => {
		element.removeEventListener("pointerover", warm);
		element.removeEventListener("focusin", focus);
		element.removeEventListener("click", click, true);
		element.removeEventListener("keydown", keydown, true);
		element.removeEventListener("astro:unmount", dispose);
	};
	const activate = () => {
		if (activation) return activation;
		element.setAttribute("aria-busy", "true");
		module ??= Promise.resolve().then(load);
		activation = module
			.then(async (hydrate) => {
				if (!element.isConnected) return false;
				await hydrate();
				dispose();
				return true;
			})
			.catch(() => {
				module = null;
				activation = null;
				return false;
			})
			.finally(() => element.removeAttribute("aria-busy"));
		return activation;
	};
	const warm = (event: PointerEvent) => {
		const target = (event.target as Element).closest(
			"button,[role=button],[role=combobox]",
		);
		if (!target || target.closest("a[href],[data-create-page]")) return;
		module ??= Promise.resolve().then(load);
		void module.catch(() => {
			module = null;
		});
	};
	const focus = (event: FocusEvent) => {
		if (!(event.target as Element).closest("a[href],[data-create-page]"))
			void activate();
	};
	const click = async (event: MouseEvent) => {
		const target = (event.target as Element).closest<HTMLElement>(
			"button,[role=button],[role=combobox]",
		);
		if (!target || target.closest("a[href],[data-create-page]")) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if ((await activate()) && target.isConnected) target.click();
	};
	const keydown = async (event: KeyboardEvent) => {
		if (
			!["Enter", " ", "ArrowDown", "ArrowUp", "Escape", "Home", "End"].includes(
				event.key,
			)
		)
			return;
		const target = event.target as HTMLElement;
		if (target.closest("a[href],[data-create-page]")) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if ((await activate()) && target.isConnected) {
			if (event.key === "Enter" || event.key === " ") target.click();
			else
				target.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: event.key,
						code: event.code,
						shiftKey: event.shiftKey,
						ctrlKey: event.ctrlKey,
						altKey: event.altKey,
						metaKey: event.metaKey,
						bubbles: true,
						cancelable: true,
					}),
				);
		}
	};
	element.addEventListener("pointerover", warm, { passive: true });
	element.addEventListener("focusin", focus);
	element.addEventListener("click", click, true);
	element.addEventListener("keydown", keydown, true);
	element.addEventListener("astro:unmount", dispose, { once: true });
};

export default interaction;
