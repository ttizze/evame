import { describe, expect, it } from "vitest";
import { splitSegments } from "./split-segments";

describe("splitSegments", () => {
	const createSegments = (count: number, textLength: number) =>
		Array.from({ length: count }, (_, i) => ({
			id: i + 1,
			number: i + 1,
			text: "x".repeat(textLength),
		}));

	it("短い入力は1チャンクのままになる", () => {
		const chunks = splitSegments(
			[
				{ id: 1, number: 1, text: "a" },
				{ id: 2, number: 2, text: "b" },
			],
			"gemini-2.5-flash",
		);
		expect(chunks.length).toBe(1);
		expect(chunks[0].map((e) => e.number)).toEqual([1, 2]);
	});

	it("MAX_CHUNK_SIZEを超えると2チャンクに分割される", () => {
		// gemini-2.5-flash has 30,000 char limit
		// 50 * 600 = 30,000 (fits), next 600 would exceed 30,000
		const many = createSegments(100, 600);
		const chunks = splitSegments(many, "gemini-2.5-flash");
		expect(chunks.length).toBe(2);
		expect(chunks[0].length).toBe(50);
		expect(chunks[1].length).toBe(50);
	});

	it("gemini-2.0-flashは小さい上限で分割される", () => {
		// gemini-2.0-flash has 10,000 char limit
		// 16 * 600 = 9,600 (fits), next 600 would exceed 10,000
		const many = createSegments(20, 600);
		const chunks = splitSegments(many, "gemini-2.0-flash");
		expect(chunks.length).toBe(2);
		expect(chunks[0].length).toBe(16);
		expect(chunks[1].length).toBe(4);
	});
});
