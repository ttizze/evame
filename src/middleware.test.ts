import { afterEach, describe, expect, it, vi } from "vitest";

const handleI18nRouting = vi.fn();

vi.mock("next-intl/middleware", () => ({
	default: () => handleI18nRouting,
}));

vi.mock("@/i18n/routing", () => ({
	routing: {},
}));

describe("middleware", () => {
	afterEach(() => {
		handleI18nRouting.mockReset();
		vi.resetModules();
		delete process.env.MAINTENANCE_MODE;
	});

	it("MAINTENANCE_MODE=trueならmaintenanceへrewriteする", async () => {
		process.env.MAINTENANCE_MODE = "true";

		const { default: middleware } = await import("./middleware");
		const response = await middleware(
			new Request("https://example.com/ja") as never,
		);

		expect(response.headers.get("x-middleware-rewrite")).toBe(
			"https://example.com/maintenance",
		);
		expect(handleI18nRouting).not.toHaveBeenCalled();
	});

	it("MAINTENANCE_MODE=falseならi18n middlewareへ委譲する", async () => {
		const delegatedResponse = new Response(null, { status: 204 });
		handleI18nRouting.mockResolvedValue(delegatedResponse);

		const { default: middleware } = await import("./middleware");
		const request = new Request("https://example.com/ja");
		const response = await middleware(request as never);

		expect(handleI18nRouting).toHaveBeenCalledWith(request);
		expect(response).toBe(delegatedResponse);
	});
});
