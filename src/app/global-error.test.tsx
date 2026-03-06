import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

vi.mock("next/error", () => ({
	default: ({ statusCode }: { statusCode: number }) => (
		<div>statusCode:{statusCode}</div>
	),
}));

describe("GlobalError", () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it("画面表示時にエラーを console.error へ送る", async () => {
		const error = new Error("global error");

		render(<GlobalError error={error} />);

		await waitFor(() => {
			expect(errorSpy).toHaveBeenCalledWith(error);
		});
	});
});
