import { describe, expect, it } from "vitest";
import { getRouter } from "./router";

describe("アプリケーションルーター", () => {
	it("TanStack Startのプリロードとスクロール復元を有効にする", () => {
		const router = getRouter();

		expect(router.options.defaultPreload).toBe("intent");
		expect(router.options.scrollRestoration).toBe(true);
	});
});
