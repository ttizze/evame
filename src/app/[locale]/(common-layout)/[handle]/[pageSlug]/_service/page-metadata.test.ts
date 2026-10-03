import { describe, expect, it } from "vitest";
import type { PageDetail } from "@/app/[locale]/types";
import { buildPageMetadata } from "./page-metadata";

describe("buildPageMetadata", () => {
	it("PUBLIC以外の記事を公開済みとして扱わない", () => {
		const metadata = buildPageMetadata({
			completedTranslationLocales: [],
			description: "記事",
			pageDetail: {
				slug: "draft-page",
				sourceLocale: "ja",
				status: "DRAFT",
				title: "記事タイトル",
				userHandle: "evame",
			} as PageDetail,
		});

		expect(metadata.isDraft).toBe(true);
		expect(metadata.title).toBe("記事タイトル (Draft)");
	});
});
