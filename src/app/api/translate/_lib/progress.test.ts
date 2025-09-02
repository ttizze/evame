import { describe, expect, it } from "vitest";
import { stepForChunk } from "./progress";

describe("stepForChunk", () => {
	it("distributes remainder to early indices and sums to 100 (3)", () => {
		const steps = [0, 1, 2].map((i) => stepForChunk(3, i));
		expect(steps).toEqual([34, 33, 33]);
		expect(steps.reduce((a, b) => a + b, 0)).toBe(100);
	});

	it("distributes remainder to early indices and sums to 100 (6)", () => {
		const steps = Array.from({ length: 6 }, (_, i) => stepForChunk(6, i));
		expect(steps).toEqual([17, 17, 17, 17, 16, 16]);
		expect(steps.reduce((a, b) => a + b, 0)).toBe(100);
	});
});
