import { describe, expect, it } from "vitest";
import { supportedLocales } from "@/domain/locales";
import { getSeoCopy } from "./copy";
import { buildLocalizedHead } from "./metadata";

describe("公開ページの SEO metadata", () => {
	it("canonical と 21 locale の hreflang、OG、X card、JSON-LD を生成する", () => {
		const head = buildLocalizedHead({
			origin: "https://digital-buddhism.example/",
			locale: "ja",
			path: "/ja/dhammapada",
			pathForLocale: (locale) => `/${locale}/dhammapada`,
			title: "法句経",
			description: "パーリ原文と翻訳案を読む",
			type: "article",
			scriptureTitle: "Dhammapada",
		});

		expect(head.links).toContainEqual({
			rel: "canonical",
			href: "https://digital-buddhism.example/ja/dhammapada",
		});
		expect(head.links).toContainEqual({
			rel: "alternate",
			hrefLang: "en",
			href: "https://digital-buddhism.example/en/dhammapada",
		});
		expect(head.links).toContainEqual({
			rel: "alternate",
			hrefLang: "ja",
			href: "https://digital-buddhism.example/ja/dhammapada",
		});
		expect(head.links).toContainEqual({
			rel: "alternate",
			hrefLang: "x-default",
			href: "https://digital-buddhism.example/en/dhammapada",
		});
		expect(head.links).toHaveLength(23);

		expect(head.meta).toContainEqual({
			property: "og:image",
			content: "https://digital-buddhism.example/bg-ogp.png",
		});
		expect(head.meta).toContainEqual({
			name: "twitter:card",
			content: "summary_large_image",
		});

		const jsonLd = head.meta.find((meta) => "script:ld+json" in meta) as
			| { "script:ld+json": Record<string, unknown> }
			| undefined;
		expect(jsonLd?.["script:ld+json"]).toMatchObject({
			"@context": "https://schema.org",
			"@type": "Article",
			inLanguage: "ja",
			url: "https://digital-buddhism.example/ja/dhammapada",
			about: { name: "Dhammapada" },
		});
	});

	it("不正な origin と locale でも安全な既定値を使う", () => {
		const head = buildLocalizedHead({
			origin: "not a URL",
			locale: "unknown",
			path: "/en",
			pathForLocale: (locale) => `/${locale}`,
			title: "Digital Buddhism",
			description: "Published Buddhist scriptures",
		});

		expect(head.links[0]).toEqual({
			rel: "canonical",
			href: "http://localhost:5173/en",
		});
		expect(head.links).toContainEqual({
			rel: "alternate",
			hrefLang: "x-default",
			href: "http://localhost:5173/en",
		});
		expect(head.meta).toContainEqual({
			property: "og:locale",
			content: "en",
		});
	});

	it("現行21 localeすべてにtitleとdescriptionを返し、未翻訳localeは英語へ明示fallbackする", () => {
		const english = getSeoCopy("en");
		const localizedCodes = new Set(["en", "ja", "zh", "ko", "es"]);

		expect(supportedLocales).toHaveLength(21);

		for (const { code } of supportedLocales) {
			const copy = getSeoCopy(code);
			expect(copy.indexTitle, code).not.toBe("");
			expect(copy.indexDescription, code).not.toBe("");
			expect(copy.readerDescription, code).not.toBe("");

			const head = buildLocalizedHead({
				origin: "https://digital-buddhism.example",
				locale: code,
				path: `/${code}`,
				pathForLocale: (targetLocale) => `/${targetLocale}`,
				title: copy.indexTitle,
				description: copy.indexDescription,
			});
			expect(head.meta).toContainEqual({ title: copy.indexTitle });
			expect(head.meta).toContainEqual({
				name: "description",
				content: copy.indexDescription,
			});

			if (!localizedCodes.has(code)) {
				expect(copy, code).toEqual(english);
			}
		}

		expect(getSeoCopy("unknown")).toEqual(english);
	});
});
