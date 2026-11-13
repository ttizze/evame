import { fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "./user-avatar.client";

afterEach(() => document.body.replaceChildren());

it("画像を読み込むとHTMLの画像を表示し、代替の頭文字を隠す", () => {
	document.body.innerHTML =
		'<evame-avatar><span>A</span><img src="/avatar.png" style="opacity:0" /></evame-avatar>';
	const image = document.querySelector("img")!;
	Object.defineProperty(image, "naturalWidth", { value: 20 });
	Object.defineProperty(image, "complete", { value: true });
	fireEvent.load(image);
	expect(image.style.opacity).toBe("1");
	expect(document.querySelector("span")?.hidden).toBe(true);
});

it("表示中の画像を差し替え・削除したら、読み込み完了まで頭文字へ戻す", async () => {
	document.body.innerHTML =
		'<evame-avatar><span>A</span><img src="/avatar.png" /></evame-avatar>';
	const image = document.querySelector("img")!;
	let loaded = true;
	Object.defineProperty(image, "naturalWidth", {
		get: () => (loaded ? 20 : 0),
	});
	Object.defineProperty(image, "complete", { get: () => loaded });
	fireEvent.load(image);
	expect(document.querySelector("span")?.hidden).toBe(true);
	loaded = false;
	image.src = "/replacement.png";
	await vi.waitFor(() =>
		expect(document.querySelector("span")?.hidden).toBe(false),
	);
	expect(image.hidden).toBe(false);
	expect(image.style.opacity).toBe("0");
	loaded = true;
	fireEvent.load(image);
	expect(document.querySelector("span")?.hidden).toBe(true);
	loaded = false;
	image.removeAttribute("src");
	await vi.waitFor(() =>
		expect(document.querySelector("span")?.hidden).toBe(false),
	);
	expect(image.hidden).toBe(true);
});

it("画像の読み込みが失敗しても頭文字を表示し、壊れた画像を隠す", () => {
	document.body.innerHTML =
		'<evame-avatar><span aria-hidden="true">A</span><img src="/missing.png" style="opacity:0" /></evame-avatar>';
	const image = document.querySelector("img")!;
	Object.defineProperty(image, "complete", { value: true });
	fireEvent.error(image);
	expect(image.hidden).toBe(true);
	expect(document.querySelector("span")?.hidden).toBe(false);
	expect(document.querySelector("span")?.getAttribute("aria-hidden")).not.toBe(
		"true",
	);
});
