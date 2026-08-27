import { describe, expect, it } from "vitest";
import { ROOT_LANGUAGE, rootMetadata } from "./__root";

describe("アプリケーションのドキュメントメタデータ", () => {
	it("グローバルサービス名と英語の既定メタデータを使う", () => {
		expect(ROOT_LANGUAGE).toBe("en");
		expect(rootMetadata.title).toBe("Digital Buddhism");
		expect(rootMetadata.description).toMatch(
			/reading Buddhist scriptures|comparing translations/i,
		);
	});
});
