import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { revalidatePageTreeAllLocales } from "./revalidate-utils";

// t-wada TDD style
// - 明確なコンテキスト（describe）
// - Given / When / Then の段落コメント
// - 余計な前提を置かない、観測可能な振る舞いのみ検証

describe("revalidatePageTreeAllLocales", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("ページが存在する", () => {
		it("自己と祖先を利用可能なロケールで再検証する", async () => {
			// Given: gp(11) -> p(10) -> self(1)
			vi.spyOn(prisma.page, "findUnique").mockImplementation((async (
				// biome-ignore lint/suspicious/noExplicitAny: <>
				args: any,
			) => {
				const id = args.where.id as number;
				if (id === 1)
					return {
						id: 1,
						slug: "self",
						sourceLocale: "pi",
						user: { handle: "u" },
						parentId: 10,
						pageLocaleTranslationProofs: [{ locale: "ja" }],
						// biome-ignore lint/suspicious/noExplicitAny: <>
					} as any;
				if (id === 10)
					return {
						id: 10,
						slug: "p1",
						sourceLocale: "en",
						user: { handle: "u" },
						parentId: 11,
						pageLocaleTranslationProofs: [{ locale: "ja" }],
						// biome-ignore lint/suspicious/noExplicitAny: <>
					} as any;
				if (id === 11)
					return {
						id: 11,
						slug: "p2",
						sourceLocale: "en",
						user: { handle: "u" },
						parentId: null,
						pageLocaleTranslationProofs: [],
						// biome-ignore lint/suspicious/noExplicitAny: <>
					} as any;
				// biome-ignore lint/suspicious/noExplicitAny: <>
				return null as any;
				// biome-ignore lint/suspicious/noExplicitAny: <>
			}) as any);
			const revalidated: string[] = [];
			const revalidateSpy = (p: string) => void revalidated.push(p);

			// When
			await revalidatePageTreeAllLocales(1, { revalidateFn: revalidateSpy });

			// Then
			const expected = new Set([
				"/user/u/page/self",
				"/pi/user/u/page/self",
				"/ja/user/u/page/self",
				"/user/u/page/p1",
				"/en/user/u/page/p1",
				"/ja/user/u/page/p1",
				"/user/u/page/p2",
				"/en/user/u/page/p2",
			]);
			expect(new Set(revalidated)).toEqual(expected);
		});
	});
});
