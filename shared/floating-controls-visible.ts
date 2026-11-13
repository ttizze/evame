export function floatingControlsVisible(
	current: number,
	previous: number,
	viewportHeight: number,
) {
	return current <= previous || current < viewportHeight * 0.03;
}
