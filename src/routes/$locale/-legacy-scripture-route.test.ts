import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	getChildPages: vi.fn(),
	getPageInteractionState: vi.fn(),
	getScripture: vi.fn(),
}));

vi.mock("@/app/[locale]/_db/page-interactions", () => ({
	getPageInteractionState: state.getPageInteractionState,
}));
vi.mock("@/app/[locale]/_db/page-tree", () => ({
	getChildPages: state.getChildPages,
}));
vi.mock("./-scripture-data", () => ({
	getScripture: state.getScripture,
}));

import { Route } from "./$handle/$pageSlug";

type Loader = (context: unknown) => unknown;

function routeLoader(): Loader {
	const loader = (Route as { options: { loader?: Loader } }).options.loader;
	if (!loader) throw new Error("loaderが見つかりません");
	return loader;
}

describe("旧形式の仏典詳細route", () => {
	it("locale・handle・pageSlugを保ったまま仏典を取得する", async () => {
		state.getScripture.mockResolvedValue({ id: "7", ownerHandle: "tipitaka" });
		state.getChildPages.mockResolvedValue([]);
		state.getPageInteractionState.mockResolvedValue({
			liked: false,
			likeCount: 0,
			viewCount: 0,
		});

		await expect(
			routeLoader()({
				params: { locale: "ja", handle: "tipitaka", pageSlug: "dhammapada" },
			}),
		).resolves.toMatchObject({ ownerHandle: "tipitaka" });
		expect(state.getScripture).toHaveBeenCalledWith({
			data: { locale: "ja", slug: "dhammapada" },
		});
		expect(state.getChildPages).toHaveBeenCalledWith({
			data: { locale: "ja", parentId: 7 },
		});
		expect(state.getPageInteractionState).toHaveBeenCalledWith({
			data: { pageId: 7 },
		});
	});

	it("所有者handleがURLと異なる詳細はnotFoundにする", async () => {
		state.getScripture.mockResolvedValue({ ownerHandle: "another-owner" });

		await expect(
			routeLoader()({
				params: { locale: "en", handle: "wrong-owner", pageSlug: "sutta" },
			}),
		).rejects.toSatisfy((error) => isNotFound(error));
	});
});
