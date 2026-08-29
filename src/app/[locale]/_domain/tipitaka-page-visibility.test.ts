import { describe, expect, it } from "vitest";
import { isPagePubliclyReadable } from "./tipitaka-page-visibility";

describe("isPagePubliclyReadable", () => {
	it("PUBLICページはTipiṭaka以外でも公開する", () => {
		expect(
			isPagePubliclyReadable({
				isTipitakaPage: false,
				publishedAt: null,
				status: "PUBLIC",
			}),
		).toBe(true);
	});

	it("公開日時があるTipiṭakaのARCHIVEページは公開する", () => {
		expect(
			isPagePubliclyReadable({
				isTipitakaPage: true,
				publishedAt: new Date("2026-01-01T00:00:00.000Z"),
				status: "ARCHIVE",
			}),
		).toBe(true);
	});

	it("Tipiṭaka以外のARCHIVEページは公開日時があっても公開しない", () => {
		expect(
			isPagePubliclyReadable({
				isTipitakaPage: false,
				publishedAt: new Date("2026-01-01T00:00:00.000Z"),
				status: "ARCHIVE",
			}),
		).toBe(false);
	});

	it("公開日時がないTipiṭakaのARCHIVEページは公開しない", () => {
		expect(
			isPagePubliclyReadable({
				isTipitakaPage: true,
				publishedAt: null,
				status: "ARCHIVE",
			}),
		).toBe(false);
	});
});
