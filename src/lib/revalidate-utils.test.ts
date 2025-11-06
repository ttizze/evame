import { afterEach, describe, expect, it, vi } from "vitest";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { prisma } from "@/lib/prisma";
import { revalidatePageTreeAllLocales } from "./revalidate-utils";

const originalFindUnique = prisma.page.findUnique;
const originalFindMany = prisma.page.findMany;

// t-wada TDD style
// - 明確なコンテキスト（describe）
// - Given / When / Then の段落コメント
// - 余計な前提を置かない、観測可能な振る舞いのみ検証

describe("revalidatePageTreeAllLocales", () => {
	afterEach(() => {
		prisma.page.findUnique = originalFindUnique;
		prisma.page.findMany = originalFindMany;
		vi.restoreAllMocks();
	});

	describe("ページが存在する", () => {
		it("祖先と公開な子孫を全ロケールで再検証する", async () => {
			// Given: gp(11) -> p(10) -> self(1) -> c1(2) -> gc1(4)
			//                              └─ c2(3)
			const findUniqueMock = vi.fn((async (
				// biome-ignore lint/suspicious/noExplicitAny: <>
				args: any,
			) => {
				const id = args.where.id as number;
				if (id === 1)
					return {
						id: 1,
						slug: "self",
						user: { handle: "u" },
						parentId: 10,
						// biome-ignore lint/suspicious/noExplicitAny: <>
					} as any;
				if (id === 10)
					return {
						id: 10,
						slug: "p1",
						user: { handle: "u" },
						parentId: 11,
						// biome-ignore lint/suspicious/noExplicitAny: <>
					} as any;
				if (id === 11)
					return {
						id: 11,
						slug: "p2",
						user: { handle: "u" },
						parentId: null,
						// biome-ignore lint/suspicious/noExplicitAny: <>
					} as any;
				// biome-ignore lint/suspicious/noExplicitAny: <>
				return null as any;
				// biome-ignore lint/suspicious/noExplicitAny: <>
			}) as any);
			prisma.page.findUnique =
				findUniqueMock as unknown as typeof originalFindUnique;

			const findManyMock = vi.fn((async (
				// biome-ignore lint/suspicious/noExplicitAny: <>
				args: any,
			) => {
				const ins: number[] = args.where.parentId.in ?? [];
				// biome-ignore lint/suspicious/noExplicitAny: <>
				const rows: any[] = [];
				if (ins.includes(1)) {
					rows.push(
						{ id: 2, slug: "c1", user: { handle: "u" } },
						{ id: 3, slug: "c2", user: { handle: "u" } },
					);
				}
				if (ins.includes(2)) {
					rows.push({ id: 4, slug: "gc1", user: { handle: "u" } });
				}
				return rows;
				// biome-ignore lint/suspicious/noExplicitAny: <>
			}) as any);
			prisma.page.findMany = findManyMock as unknown as typeof originalFindMany;
			const revalidated: string[] = [];
			const revalidateSpy = (p: string) => void revalidated.push(p);

			// When
			await revalidatePageTreeAllLocales(1, revalidateSpy);

			// Then
			const targets = [
				"/user/u/page/self",
				"/user/u/page/p1",
				"/user/u/page/p2",
				"/user/u/page/c1",
				"/user/u/page/c2",
				"/user/u/page/gc1",
			];
			const expected = targets.length * (1 + supportedLocaleOptions.length);
			expect(revalidated.length).toBe(expected);
			for (const base of targets) {
				expect(revalidated).toContain(base);
				for (const { code } of supportedLocaleOptions.slice(0, 2)) {
					expect(revalidated).toContain(`/${code}${base}`);
				}
			}
		});
	});
});
