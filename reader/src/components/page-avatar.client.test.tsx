import { fireEvent } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import "./page-avatar.client";

afterEach(() => document.body.replaceChildren());

it("画像を読み込むとHTMLの画像を表示し、代替の頭文字を隠す", () => {
	document.body.innerHTML =
		'<evame-page-avatar><span>A</span><img src="/avatar.png" style="opacity:0" /></evame-page-avatar>';
	const image = document.querySelector("img")!;
	Object.defineProperty(image, "naturalWidth", { value: 20 });
	fireEvent.load(image);
	expect(image.style.opacity).toBe("1");
	expect(document.querySelector("span")?.hidden).toBe(true);
});

it("画像の読み込みが失敗しても頭文字を表示し、壊れた画像を隠す", () => {
	document.body.innerHTML =
		'<evame-page-avatar><span aria-hidden="true">A</span><img src="/missing.png" style="opacity:0" /></evame-page-avatar>';
	const image = document.querySelector("img")!;
	fireEvent.error(image);
	expect(image.hidden).toBe(true);
	expect(document.querySelector("span")?.hidden).toBe(false);
	expect(document.querySelector("span")?.getAttribute("aria-hidden")).not.toBe(
		"true",
	);
});
