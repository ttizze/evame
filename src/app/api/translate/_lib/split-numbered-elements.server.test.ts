import { describe, expect, it } from "vitest";
import { splitNumberedElements } from "./split-numbered-elements.server";

describe("splitNumberedElements", () => {
	it("keeps small inputs in a single chunk", () => {
		const chunks = splitNumberedElements([
			{ number: 1, text: "a" },
			{ number: 2, text: "b" },
		]);
		expect(chunks.length).toBe(1);
		expect(chunks[0].map((e) => e.number)).toEqual([1, 2]);
	});

	it("splits when exceeding MAX_CHUNK_SIZE", () => {
		// 16 * 600 = 9600 (fits), next 600 would exceed 10000
		const many = Array.from({ length: 20 }, (_, i) => ({
			number: i + 1,
			text: "x".repeat(600),
		}));
		const chunks = splitNumberedElements(many);
		expect(chunks.length).toBe(2);
		expect(chunks[0].length).toBe(16);
		expect(chunks[1].length).toBe(4);
	});
});
