import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "./page-view-counter.client";

const request = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", request));
afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
	request.mockReset();
});

it("HTMLの閲覧数を表示し、Reactを待たず一度だけ加算する", async () => {
	let complete!: (response: Response) => void;
	request.mockReturnValue(
		new Promise((resolve) => {
			complete = resolve;
		}),
	);
	document.body.innerHTML =
		'<evame-page-views data-page-id="7">12</evame-page-views>';
	expect(document.body.textContent).toBe("12");
	expect(request).toHaveBeenCalledWith(
		"/api/page-views/7/increment",
		expect.objectContaining({
			method: "POST",
			credentials: "include",
			keepalive: true,
		}),
	);
	complete(Response.json({ count: 13 }));
	await vi.waitFor(() => expect(document.body.textContent).toBe("13"));
	const counter = document.body.firstElementChild!;
	counter.remove();
	document.body.append(counter);
	window.dispatchEvent(new Event("focus"));
	window.dispatchEvent(new Event("online"));
	expect(request).toHaveBeenCalledTimes(1);
});

it.each([new Response(null, { status: 500 }), Response.json({ count: "13" })])(
	"加算に失敗してもHTMLの閲覧数を維持する",
	async (response) => {
		request.mockResolvedValue(response);
		document.body.innerHTML =
			'<evame-page-views data-page-id="7">12</evame-page-views>';
		await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.textContent).toBe("12");
	},
);
