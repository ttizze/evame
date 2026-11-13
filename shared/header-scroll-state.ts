export function headerScrollState(
	current: number,
	previous: number,
	anchorTop: number,
	pinned: boolean,
	visible: boolean,
) {
	if (current <= 0 || anchorTop > 0) return { pinned: false, visible: true };
	if (current - previous > 5) return { pinned: false, visible: false };
	if (previous - current > 5) return { pinned: true, visible: true };
	return { pinned, visible };
}
