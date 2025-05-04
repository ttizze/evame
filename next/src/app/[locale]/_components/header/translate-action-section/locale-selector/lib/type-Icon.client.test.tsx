import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypeIcon } from "./type-Icon.client";

describe("TypeIcon", () => {
	it("ソースロケールと同じコードの場合、Text アイコンをレンダリングする", () => {
		render(<TypeIcon status="source" />);
		expect(screen.getByTestId("source-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードで、翻訳情報が存在して翻訳が完了している場合、Languages アイコンをレンダリングする", () => {
		render(<TypeIcon status="translated" />);
		expect(screen.getByTestId("translated-icon")).toBeInTheDocument();
	});

	it("ソースロケールと異なるコードで、翻訳情報が存在しない場合、Languages アイコンをレンダリングする", () => {
		render(<TypeIcon status="untranslated" />);
		expect(screen.getByTestId("untranslated-icon")).toBeInTheDocument();
	});
});
