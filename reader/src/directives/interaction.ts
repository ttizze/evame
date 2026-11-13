import type { ClientDirective } from "astro";

const interaction: ClientDirective = (load, _options, element) => {
	const controls = "button,[role=button],[role=combobox]";
	const nativeControls = "a[href],[data-create-page],[data-like-page]";
	let module: ReturnType<typeof load> | null = null;
	let activation: Promise<boolean> | null = null;
	let finishReady = () => {};

	const dispose = () => {
		finishReady();
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
				// Astroのhydrate()はReactの起動を予約して返る。イベントを渡すのはコミット後。
				const ready = new Promise<void>((resolve) => {
					finishReady = () => {
						element.removeEventListener("reader:ready", finishReady);
						resolve();
					};
					if (
						!element.hasAttribute("ssr") ||
						element.hasAttribute("data-reader-ready")
					)
						finishReady();
					else
						element.addEventListener("reader:ready", finishReady, {
							once: true,
						});
				});
				await hydrate();
				await ready;
				dispose();
				return element.isConnected;
			})
			.catch(() => {
				finishReady();
				module = null;
				activation = null;
				return false;
			})
			.finally(() => element.removeAttribute("aria-busy"));
		return activation;
	};
	const activateControl = async (index: number) => {
		if (!(await activate())) return null;
		const current = element.querySelectorAll<HTMLElement>(controls)[index];
		current?.focus({ preventScroll: true });
		return current;
	};
	const warm = (event: PointerEvent) => {
		const tooltip = (event.target as Element).closest("[data-reader-tooltip]");
		if (tooltip) {
			void activate().then((ready) => {
				const current = element.querySelector("[data-reader-tooltip]");
				if (ready && current?.matches(":hover"))
					current.dispatchEvent(
						new PointerEvent("pointermove", {
							bubbles: true,
							pointerType: event.pointerType,
							clientX: event.clientX,
							clientY: event.clientY,
						}),
					);
			});
			return;
		}
		const target = (event.target as Element).closest(controls);
		if (!target || target.closest(nativeControls)) return;
		module ??= Promise.resolve().then(load);
		void module.catch(() => {
			module = null;
		});
	};
	const focus = (event: FocusEvent) => {
		const tooltip = (event.target as Element).closest("[data-reader-tooltip]");
		if (tooltip) {
			void activate().then((ready) => {
				if (
					ready &&
					(document.activeElement === tooltip ||
						document.activeElement === document.body)
				)
					element
						.querySelector<HTMLElement>("[data-reader-tooltip]")
						?.focus({ preventScroll: true });
			});
			return;
		}
		if (!(event.target as Element).closest(nativeControls)) void activate();
	};
	const click = async (event: MouseEvent) => {
		const target = (event.target as Element).closest<HTMLElement>(controls);
		if (!target || target.closest(nativeControls)) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		const current = await activateControl(
			[...element.querySelectorAll(controls)].indexOf(target),
		);
		current?.click();
	};
	const keydown = async (event: KeyboardEvent) => {
		if (
			!["Enter", " ", "ArrowDown", "ArrowUp", "Escape", "Home", "End"].includes(
				event.key,
			)
		)
			return;
		const target = (event.target as Element).closest<HTMLElement>(controls);
		if (!target || target.closest(nativeControls)) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		const current = await activateControl(
			[...element.querySelectorAll(controls)].indexOf(target),
		);
		if (current) {
			if (event.key === "Enter" || event.key === " ") current.click();
			else
				current.dispatchEvent(
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
