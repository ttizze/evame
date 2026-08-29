import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("記事詳細ルート", () => {
	it("プロフィールルートにネストせずURLだけを共有する", () => {
		expect(
			existsSync(resolve("src/routes/$locale._common.$handle_.$pageSlug.tsx")),
		).toBe(true);
		expect(
			existsSync(resolve("src/routes/$locale._common.$handle.$pageSlug.tsx")),
		).toBe(false);
	});
});
