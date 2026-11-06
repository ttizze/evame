import { csrfSymbol } from "@tanstack/react-start";
import { expect, it } from "vitest";
import { sentryMiddleware, startInstance } from "./start";

it("Server FunctionのCSRF検証とSentry監視を維持する", async () => {
	const options = await startInstance.getOptions();
	const [csrfMiddleware] = options.requestMiddleware ?? [];
	expect(options.functionMiddleware).toEqual([sentryMiddleware]);
	expect(csrfMiddleware).toBeDefined();
	if (!csrfMiddleware) throw new Error("CSRF middlewareが登録されていません");
	expect(csrfSymbol in csrfMiddleware).toBe(true);
});
