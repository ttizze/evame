export function stepForChunk(total: number, index: number): number {
	// Distribute 100 across total chunks without Math.*.
	// The first (100 % total) chunks get +1 extra.
	const base = (100 - (100 % total)) / total;
	const extra = 100 % total;
	return index < extra ? base + 1 : base;
}
