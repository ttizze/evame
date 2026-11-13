import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import "./locale-status.client";

afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

it("言語ボタンの起動中に要素が付け直されても、新しい取得を開始できる", async () => {
	const request = vi.fn().mockImplementation(() => new Promise(() => {}));
	vi.stubGlobal("fetch", request);
	document.body.innerHTML =
		'<evame-locale-status data-page-slug="notes" data-locale="ja"></evame-locale-status>';
	const status = document.body.firstElementChild!;
	expect(request).toHaveBeenCalledTimes(1);
	status.remove();
	document.body.append(status);
	expect(request).toHaveBeenCalledTimes(2);
});

it.each([
	["ja", "source"],
	["en", "PROOFREAD"],
	["fr", "untranslated"],
])("%sの翻訳状態をReactを待たず表示する", async (locale, expected) => {
	const fetchInfo = vi.fn().mockResolvedValue(
		Response.json({
			sourceLocale: "ja",
			translationJobs: [{ locale: "en" }],
			translationProofs: [
				{ locale: "en", translationProofStatus: "PROOFREAD" },
			],
		}),
	);
	vi.stubGlobal("fetch", fetchInfo);
	document.body.innerHTML = `<evame-locale-status data-page-slug="notes" data-locale="${locale}"><span data-locale-status-icon></span>${["source", "untranslated", "MACHINE_DRAFT", "PROOFREAD"].map((status) => `<template data-locale-status="${status}"><svg data-icon="${status}"></svg></template>`).join("")}</evame-locale-status>`;
	await vi.waitFor(() =>
		expect(
			document.querySelector("[data-locale-status-icon] svg"),
		).toHaveAttribute("data-icon", expected),
	);
	expect(fetchInfo).toHaveBeenCalledWith(
		"/api/locale-info?pageSlug=notes",
		expect.objectContaining({ cache: "no-store" }),
	);
});
