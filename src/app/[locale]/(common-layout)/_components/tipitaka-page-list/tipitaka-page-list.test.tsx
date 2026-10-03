import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children: ReactNode;
		className: string;
	}) => (
		<a className={className} href="/ja/evame/tipitaka">
			{children}
		</a>
	),
}));

import { TipitakaPageList } from "./tipitaka-page-list";

describe("Tipiṭaka一覧", () => {
	it("一覧内のsegmentだけ800pxの仮高さを無効にする", () => {
		render(
			<TipitakaPageList
				locale="ja"
				pages={[
					{
						id: 1,
						slug: "tipitaka",
						parentId: 0,
						order: 0,
						userHandle: "evame",
						titleSegmentId: 10,
						titleText: "Tipitaka Mula",
						titleTranslationText: null,
						children: [],
					},
				]}
			/>,
		);

		expect(screen.getByRole("navigation", { name: "Tipiṭaka" })).toHaveClass(
			"tipitaka-tree",
		);
	});
});
