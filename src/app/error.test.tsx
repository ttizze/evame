import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

describe("ErrorPage", () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it("画面表示時にエラーを console.error へ送る", async () => {
		const error = new Error("test error");

		render(<ErrorPage error={error} reset={vi.fn()} />);

		await waitFor(() => {
			expect(errorSpy).toHaveBeenCalledWith(error);
		});
	});
});
