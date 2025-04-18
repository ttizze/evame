import { TranslationStatus } from "@prisma/client";
import type { TranslationJob } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypeIcon } from "./type-Icon.client";

describe("TypeIcon", () => {
	it("ソースロケールと同じコードの場合、Text アイコンをレンダリングする", () => {
		render(<TypeIcon code="en" sourceLocale="en" />);
		expect(screen.getByTestId("text-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードかつ翻訳情報が存在し、かつ翻訳が完了していない場合、Loader2 アイコンをレンダリングする", () => {
		// 翻訳が進行中（例: IN_PROGRESS）の場合
		const translationJobs = [
			{
				locale: "fr",
				status: TranslationStatus.IN_PROGRESS,
			} as TranslationJob,
		];
		render(
			<TypeIcon
				code="fr"
				sourceLocale="en"
				translationJobs={translationJobs}
			/>,
		);
		expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードで、翻訳情報が存在しない場合、Languages アイコンをレンダリングする", () => {
		render(<TypeIcon code="fr" sourceLocale="en" />);
		expect(screen.getByTestId("languages-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードで、翻訳情報が存在して翻訳が完了している場合、Languages アイコンをレンダリングする", () => {
		// 翻訳が完了している場合
		const translationJobs = [
			{
				locale: "fr",
				status: TranslationStatus.COMPLETED,
			} as TranslationJob,
		];
		render(
			<TypeIcon
				code="fr"
				sourceLocale="en"
				translationJobs={translationJobs}
			/>,
		);
		expect(screen.getByTestId("languages-icon")).toBeInTheDocument();
	});
});
