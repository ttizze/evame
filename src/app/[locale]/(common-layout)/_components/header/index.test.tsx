import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { HeaderFrame } from "./index";

it.each(["共通トップ", "ブログ"])(
	"%sのヘッダーを本文と同じ横幅・左右余白にし、ブランドと右側の操作を保つ",
	(kind) => {
		render(
			<HeaderFrame
				brand={kind === "ブログ" ? <a href="/ja/alice">開発ノート</a> : null}
				locale="ja"
				userSlot={<a href="/ja/auth/login">ログイン</a>}
			/>,
		);
		const header = screen.getByRole("banner");
		expect(Array.from(header.classList)).toEqual(
			expect.arrayContaining(["max-w-4xl", "px-4"]),
		);
		expect(header.classList.contains("max-w-3xl")).toBe(false);
		const controls = within(header);
		expect(controls.getByRole("link", { name: "ログイン" })).not.toBeNull();
		expect(controls.queryByRole("link", { name: "記事" })).toBeNull();
		if (kind === "ブログ") {
			expect(
				controls.getByRole("link", { name: "開発ノート" }).getAttribute("href"),
			).toBe("/ja/alice");
			expect(controls.queryByRole("img", { name: /Evame/ })).toBeNull();
		} else {
			expect(
				controls.getAllByRole("img", { name: "Evame Logo" }).length,
			).toBeGreaterThan(0);
		}
	},
);
