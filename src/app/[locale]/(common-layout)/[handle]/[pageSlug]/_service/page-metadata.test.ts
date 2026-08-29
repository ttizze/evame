import { describe, expect, it } from "vitest";
import type { PageDetail } from "@/app/[locale]/types";
import { buildPageMetadata } from "./page-metadata";

describe("buildPageMetadata", () => {
	it("公開日時があるTipiṭakaのARCHIVEページを下書き扱いしない", () => {
		const metadata = buildPageMetadata({
			completedTranslationLocales: [],
			description: "Tipiṭaka",
			pageDetail: {
				isPublishedTipitakaArchive: true,
				slug: "vinaya-pitaka",
				sourceLocale: "pi",
				status: "ARCHIVE",
				title: "Vinayapiṭaka",
				userHandle: "evame",
			} as PageDetail,
		});

		expect(metadata.isDraft).toBe(false);
		expect(metadata.title).toBe("Vinayapiṭaka");
	});
});
