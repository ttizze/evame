import type { TranslationProofStatus } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProofStatusIcon } from "./proof-status-icon.client";

describe("ProofStatusIcon", () => {
	it("MACHINE_DRAFTステータスの場合、適切な色とラベルが表示される", () => {
		render(<ProofStatusIcon translationProofStatus="MACHINE_DRAFT" />);
		const icon = screen.getByTestId("proof-MACHINE_DRAFT-icon");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass("text-rose-500");
	});

	it("HUMAN_TOUCHEDステータスの場合、適切な色とラベルが表示される", () => {
		render(<ProofStatusIcon translationProofStatus="HUMAN_TOUCHED" />);
		const icon = screen.getByTestId("proof-HUMAN_TOUCHED-icon");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass("text-orange-400");
	});

	it("PROOFREADステータスの場合、適切な色とラベルが表示される", () => {
		render(<ProofStatusIcon translationProofStatus="PROOFREAD" />);
		const icon = screen.getByTestId("proof-PROOFREAD-icon");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass("text-amber-400");
	});

	it("VALIDATEDステータスの場合、適切な色とラベルが表示される", () => {
		render(<ProofStatusIcon translationProofStatus="VALIDATED" />);
		const icon = screen.getByTestId("proof-VALIDATED-icon");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass("text-emerald-500");
	});

	it("すべてのproofステータスで正しいアイコンが表示される", () => {
		const proofStatuses: TranslationProofStatus[] = [
			"MACHINE_DRAFT",
			"HUMAN_TOUCHED",
			"PROOFREAD",
			"VALIDATED",
		];

		proofStatuses.forEach((status) => {
			const { unmount } = render(
				<ProofStatusIcon translationProofStatus={status} />,
			);
			expect(screen.getByTestId(`proof-${status}-icon`)).toBeInTheDocument();
			unmount();
		});
	});

	it("Circleアイコンが使用される", () => {
		render(<ProofStatusIcon translationProofStatus="MACHINE_DRAFT" />);
		const icon = screen.getByTestId("proof-MACHINE_DRAFT-icon");
		expect(icon).toBeInTheDocument();
		expect(icon.tagName.toLowerCase()).toBe("svg");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});
});
