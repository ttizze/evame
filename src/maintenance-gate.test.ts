import { describe, expect, it } from "vitest";
import {
	getMaintenancePath,
	resolveMaintenanceLocale,
	shouldCheckMaintenance,
} from "./maintenance-gate";

describe("メンテナンスゲートの対象判定", () => {
	it("既存のmatcher除外パスをメンテナンス判定から除外する", () => {
		const excludedPaths = [
			"/api/auth/session",
			"/_next/static/chunk.js",
			"/_vercel/trace",
			"/privacy",
			"/terms/license",
			"/monitoring/health",
			"/maintenance",
			"/sitemap",
			"/sitemap.xml",
			"/sitemap/part.xml",
			"/images/logo.svg",
			"/ja/maintenance",
		];

		for (const pathname of excludedPaths) {
			expect(shouldCheckMaintenance(pathname), pathname).toBe(false);
		}
	});

	it("通常のページパスだけをメンテナンス判定の対象にする", () => {
		expect(shouldCheckMaintenance("/")).toBe(true);
		expect(shouldCheckMaintenance("/ja/about")).toBe(true);
		expect(shouldCheckMaintenance("/auth/login")).toBe(true);
		expect(shouldCheckMaintenance("/ja/about.json")).toBe(false);
	});

	it("maintenanceを含む通常ページslugは判定対象にする", () => {
		expect(shouldCheckMaintenance("/maintenance-guide")).toBe(true);
		expect(shouldCheckMaintenance("/en/alice/maintenance-guide")).toBe(true);
	});
});

describe("メンテナンスページのlocale解決", () => {
	it("pathnameのlocaleをcookieやAccept-Languageより優先する", () => {
		expect(
			resolveMaintenanceLocale({
				pathname: "/ja/about",
				cookieHeader: "NEXT_LOCALE=es",
				acceptLanguage: "en-US,en;q=0.8",
			}),
		).toBe("ja");
	});

	it("pathnameの未対応localeタグはcookieへフォールバックする", () => {
		expect(
			resolveMaintenanceLocale({
				pathname: "/ja-JP/about",
				cookieHeader: "NEXT_LOCALE=en",
				acceptLanguage: "es",
			}),
		).toBe("en");
	});

	it("supported localeでないpathnameではNEXT_LOCALE cookieを使う", () => {
		expect(
			resolveMaintenanceLocale({
				pathname: "/unknown/about",
				cookieHeader: "session=abc; NEXT_LOCALE=es",
				acceptLanguage: "ja",
			}),
		).toBe("es");
	});

	it("cookieが無効ならAccept-Languageの品質順と地域タグを使う", () => {
		expect(
			resolveMaintenanceLocale({
				pathname: "/about",
				cookieHeader: "NEXT_LOCALE=xx",
				acceptLanguage: "fr-CA;q=0.7, ja-JP;q=0.9, en;q=0.8",
			}),
		).toBe("ja");
	});

	it("locale情報がなければenへフォールバックする", () => {
		expect(
			resolveMaintenanceLocale({
				pathname: "/about",
				cookieHeader: null,
				acceptLanguage: null,
			}),
		).toBe("en");
	});

	it("解決したlocaleをmaintenance routeのパスへ反映する", () => {
		expect(
			getMaintenancePath({
				pathname: "/about",
				cookieHeader: null,
				acceptLanguage: "ja-JP, en;q=0.8",
			}),
		).toBe("/ja/maintenance");
	});
});
