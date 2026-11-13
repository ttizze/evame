import { afterEach, beforeEach, expect, it } from "vitest";
import "./analytics-consent.client";

beforeEach(() => localStorage.clear());
afterEach(() => {
	document.body.replaceChildren();
	for (const script of document.head.querySelectorAll("script"))
		script.remove();
});

it("同意が未選択ならReactの起動を待たずバナーを表示し、計測は開始しない", () => {
	document.body.innerHTML =
		'<evame-analytics-consent hidden data-tracking-id="G-TEST"><button data-consent="accepted">許可</button><button data-consent="rejected">拒否</button></evame-analytics-consent>';
	expect(
		(document.querySelector("evame-analytics-consent") as HTMLElement).hidden,
	).toBe(false);
	expect(document.head.querySelector("script")).toBeNull();
});

it("許可を押すと選択を保存してバナーを閉じ、GAを一度だけ読み込む", () => {
	document.body.innerHTML =
		'<evame-analytics-consent hidden data-tracking-id="G-TEST"><button data-consent="accepted">許可</button></evame-analytics-consent>';
	(document.querySelector("button") as HTMLButtonElement).click();
	expect(localStorage.getItem("evame.analytics-consent")).toBe("accepted");
	expect(
		(document.querySelector("evame-analytics-consent") as HTMLElement).hidden,
	).toBe(true);
	expect(
		document.head.querySelectorAll('script[src*="googletagmanager.com"]'),
	).toHaveLength(1);
});

it("拒否済みならバナーを表示せず、GAを読み込まない", () => {
	localStorage.setItem("evame.analytics-consent", "rejected");
	document.body.innerHTML =
		'<evame-analytics-consent hidden data-tracking-id="G-TEST"></evame-analytics-consent>';
	expect(
		(document.querySelector("evame-analytics-consent") as HTMLElement).hidden,
	).toBe(true);
	expect(document.head.querySelector("script")).toBeNull();
});

it("許可済みなら計測を開始し、ページから外れたらスクリプトを取り除く", () => {
	localStorage.setItem("evame.analytics-consent", "accepted");
	document.body.innerHTML =
		'<evame-analytics-consent hidden data-tracking-id="G-TEST"></evame-analytics-consent>';
	expect(document.head.querySelectorAll("script")).toHaveLength(2);
	document.body.replaceChildren();
	expect(document.head.querySelector("script")).toBeNull();
});

it("GA IDが空でも同意の選択を保存し、外部通信を開始しない", () => {
	document.body.innerHTML =
		'<evame-analytics-consent hidden data-tracking-id=""><button data-consent="accepted">許可</button></evame-analytics-consent>';
	(document.querySelector("button") as HTMLButtonElement).click();
	expect(localStorage.getItem("evame.analytics-consent")).toBe("accepted");
	expect(document.head.querySelector("script")).toBeNull();
});
