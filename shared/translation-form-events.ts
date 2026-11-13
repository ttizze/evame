function hasSelection() {
	const selection = window.getSelection();
	return (
		!!selection && !selection.isCollapsed && selection.toString().length > 0
	);
}

function isClickOnText(event: MouseEvent) {
	const doc = document as Document & {
		caretRangeFromPoint?: (x: number, y: number) => Range | null;
		caretPositionFromPoint?: (
			x: number,
			y: number,
		) => { offsetNode: Node | null } | null;
	};
	if (!doc.caretRangeFromPoint && !doc.caretPositionFromPoint) return true;
	const range = doc.caretRangeFromPoint?.(event.clientX, event.clientY);
	if (range) return range.startContainer.nodeType === Node.TEXT_NODE;
	return (
		doc.caretPositionFromPoint?.(event.clientX, event.clientY)?.offsetNode
			?.nodeType === Node.TEXT_NODE
	);
}

export function subscribeTranslationForm(
	onChange: (active: { segmentId: number; rootEl: HTMLElement } | null) => void,
) {
	let activeId: number | null = null;
	let hadSelection = false;
	const toggle = (target: EventTarget | null) => {
		if (!(target instanceof Element) || target.closest("a")) return;
		const segment = target.closest<HTMLElement>("[data-segment-id]");
		const block = segment?.closest(".seg-tr");
		if (!segment || !block) return;
		const segmentId = Number(segment.dataset.segmentId);
		if (!Number.isFinite(segmentId) || segmentId <= 0) return;
		if (activeId === segmentId) {
			activeId = null;
			onChange(null);
			return;
		}
		const next = block.nextElementSibling;
		const rootEl =
			next instanceof HTMLElement && next.dataset.trFormRoot
				? next
				: document.createElement("div");
		rootEl.dataset.trFormRoot = "1";
		rootEl.className = "not-prose";
		if (rootEl !== next) block.after(rootEl);
		activeId = segmentId;
		onChange({ segmentId, rootEl });
	};
	const pointerdown = () => {
		hadSelection = hasSelection();
	};
	const click = (event: MouseEvent) => {
		if (!hadSelection && !hasSelection() && isClickOnText(event))
			toggle(event.target);
	};
	const keydown = (event: KeyboardEvent) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		const target = event.target;
		if (
			!(target instanceof Element) ||
			target.closest("a") ||
			!target.closest("[data-segment-id]")
		)
			return;
		if (event.key === " ") event.preventDefault();
		toggle(target);
	};
	document.body.addEventListener("pointerdown", pointerdown, true);
	document.body.addEventListener("click", click);
	document.body.addEventListener("keydown", keydown);
	return () => {
		document.body.removeEventListener("pointerdown", pointerdown, true);
		document.body.removeEventListener("click", click);
		document.body.removeEventListener("keydown", keydown);
	};
}
