import { describe, expect, it } from "vitest";
import { getMaxChunkSizeForModel, splitTranslationSegments } from "./chunk";

describe("AI翻訳のチャンク分割", () => {
	it("モデルごとの上限を既存契約どおりに返す", () => {
		expect(getMaxChunkSizeForModel("gemini-2.0-flash")).toBe(10_000);
		expect(getMaxChunkSizeForModel("gemini-2.5-flash")).toBe(30_000);
		expect(getMaxChunkSizeForModel("gpt-5-nano-2025-08-07")).toBe(30_000);
		expect(getMaxChunkSizeForModel("unknown-model")).toBe(10_000);
	});

	it("原文順を保ったまま文字数上限で分割する", () => {
		const segments = [
			{ id: 1, number: 0, text: "a".repeat(6_000) },
			{ id: 2, number: 1, text: "b".repeat(6_000) },
			{ id: 3, number: 2, text: "c".repeat(1_000) },
		];

		expect(splitTranslationSegments(segments, "gemini-2.0-flash")).toEqual([
			[segments[0]],
			[segments[1], segments[2]],
		]);
	});

	it("空入力は空チャンクになり、上限超過の単一セグメントは失わない", () => {
		const oversized = { id: 1, number: 0, text: "x".repeat(12_000) };

		expect(splitTranslationSegments([], "gemini-2.0-flash")).toEqual([]);
		expect(splitTranslationSegments([oversized], "gemini-2.0-flash")).toEqual([
			[oversized],
		]);
	});
});
