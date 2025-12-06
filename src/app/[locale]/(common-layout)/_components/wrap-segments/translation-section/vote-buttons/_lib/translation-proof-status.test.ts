import { TranslationProofStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calcProofStatus } from "./translation-proof-status";

describe("calcProofStatus", () => {
	describe("MACHINE_DRAFT", () => {
		it("1票以上あるセグメントが0の場合、MACHINE_DRAFTを返す", () => {
			const result = calcProofStatus(10, 0, 0);
			expect(result).toBe(TranslationProofStatus.MACHINE_DRAFT);
		});

		it("総セグメント数に関係なく、1票以上あるセグメントが0の場合はMACHINE_DRAFT", () => {
			const result = calcProofStatus(1, 0, 0);
			expect(result).toBe(TranslationProofStatus.MACHINE_DRAFT);
		});
	});

	describe("HUMAN_TOUCHED", () => {
		it("1票以上あるセグメントが総セグメント数より少ない場合、HUMAN_TOUCHEDを返す", () => {
			const result = calcProofStatus(10, 5, 2);
			expect(result).toBe(TranslationProofStatus.HUMAN_TOUCHED);
		});

		it("1票以上あるセグメントが総セグメント数より少ない場合、2票以上あるセグメント数は関係ない", () => {
			const result = calcProofStatus(10, 5, 5);
			expect(result).toBe(TranslationProofStatus.HUMAN_TOUCHED);
		});
	});

	describe("VALIDATED", () => {
		it("2票以上あるセグメントが総セグメント数と等しい場合、VALIDATEDを返す", () => {
			const result = calcProofStatus(10, 10, 10);
			expect(result).toBe(TranslationProofStatus.VALIDATED);
		});

		it("すべてのセグメントが2票以上ある場合、VALIDATEDを返す", () => {
			const result = calcProofStatus(5, 5, 5);
			expect(result).toBe(TranslationProofStatus.VALIDATED);
		});
	});

	describe("PROOFREAD", () => {
		it("すべてのセグメントが1票以上あるが、すべてが2票以上あるわけではない場合、PROOFREADを返す", () => {
			const result = calcProofStatus(10, 10, 8);
			expect(result).toBe(TranslationProofStatus.PROOFREAD);
		});

		it("すべてのセグメントが1票以上あるが、2票以上あるセグメントが0の場合、PROOFREADを返す", () => {
			const result = calcProofStatus(10, 10, 0);
			expect(result).toBe(TranslationProofStatus.PROOFREAD);
		});

		it("すべてのセグメントが1票以上あるが、一部が2票以上ある場合、PROOFREADを返す", () => {
			const result = calcProofStatus(5, 5, 3);
			expect(result).toBe(TranslationProofStatus.PROOFREAD);
		});
	});

	describe("エッジケース", () => {
		it("総セグメント数が0の場合、MACHINE_DRAFTを返す", () => {
			const result = calcProofStatus(0, 0, 0);
			expect(result).toBe(TranslationProofStatus.MACHINE_DRAFT);
		});

		it("1票以上あるセグメントが0で、2票以上あるセグメントが0の場合、MACHINE_DRAFTを返す", () => {
			const result = calcProofStatus(1, 0, 0);
			expect(result).toBe(TranslationProofStatus.MACHINE_DRAFT);
		});
	});
});
