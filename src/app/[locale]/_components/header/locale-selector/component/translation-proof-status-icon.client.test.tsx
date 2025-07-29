import { render, screen } from "@testing-library/react";
import { TranslationProofStatusIcon } from "./translation-proof-status-icon.client";

describe("TranslationProofStatusIcon", () => {
	describe("Proof Status Icons", () => {
		it("renders MACHINE_DRAFT icon", () => {
			render(
				<TranslationProofStatusIcon
					localeStatus="translated"
					proofStatus="MACHINE_DRAFT"
				/>,
			);
			expect(
				screen.getByTestId("proof-MACHINE_DRAFT-icon"),
			).toBeInTheDocument();
		});

		it("renders HUMAN_TOUCHED icon", () => {
			render(
				<TranslationProofStatusIcon
					localeStatus="translated"
					proofStatus="HUMAN_TOUCHED"
				/>,
			);
			expect(
				screen.getByTestId("proof-HUMAN_TOUCHED-icon"),
			).toBeInTheDocument();
		});

		it("renders PROOFREAD icon", () => {
			render(
				<TranslationProofStatusIcon
					localeStatus="translated"
					proofStatus="PROOFREAD"
				/>,
			);
			expect(screen.getByTestId("proof-PROOFREAD-icon")).toBeInTheDocument();
		});

		it("renders VALIDATED icon", () => {
			render(
				<TranslationProofStatusIcon
					localeStatus="translated"
					proofStatus="VALIDATED"
				/>,
			);
			expect(screen.getByTestId("proof-VALIDATED-icon")).toBeInTheDocument();
		});
	});

	describe("Translation Status Icons", () => {
		it("renders source icon", () => {
			render(<TranslationProofStatusIcon localeStatus="source" />);
			expect(screen.getByTestId("source-icon")).toBeInTheDocument();
		});

		it("renders untranslated icon", () => {
			render(<TranslationProofStatusIcon localeStatus="untranslated" />);
			expect(screen.getByTestId("untranslated-icon")).toBeInTheDocument();
		});

		it("renders translated icon when no proof status", () => {
			render(<TranslationProofStatusIcon localeStatus="translated" />);
			expect(
				screen.getByTestId("proof-MACHINE_DRAFT-icon"),
			).toBeInTheDocument();
		});
	});
});
