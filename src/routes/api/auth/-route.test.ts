import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	handler: vi.fn(async () => new Response("ok")),
}));

vi.mock("@/auth/runtime", () => ({
	getAuth: () => ({
		handler: state.handler,
		options: { baseURL: "https://example.com" },
	}),
}));

import { Route } from "./$";

describe("Better Auth catch-all route", () => {
	it("GETとPOSTをBetter Authのhandlerへ転送する", async () => {
		const handlers = Route.options.server?.handlers as {
			GET?: (input: { request: Request }) => Promise<Response>;
			POST?: (input: { request: Request }) => Promise<Response>;
		};
		const getRequest = new Request("https://example.com/api/auth/get-session");
		const postRequest = new Request("https://example.com/api/auth/sign-out", {
			method: "POST",
		});

		await expect(
			handlers.GET?.({ request: getRequest }),
		).resolves.toBeInstanceOf(Response);
		await expect(
			handlers.POST?.({ request: postRequest }),
		).resolves.toBeInstanceOf(Response);
		expect(state.handler).toHaveBeenNthCalledWith(1, getRequest);
		expect(state.handler).toHaveBeenNthCalledWith(2, postRequest);
	});
});
