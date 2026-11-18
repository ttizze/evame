// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { readPreviewSignal } from "./preview-deployment.mjs";

afterEach(() => vi.unstubAllGlobals());

it("200の本文取得が途中で切断されたら次の読み取りで公開シグナルを取得できる", async () => {
	const signal = "a".repeat(40);
	const fetch = vi
		.fn()
		.mockResolvedValueOnce(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.error(new Error("connection closed"));
					},
				}),
			),
		)
		.mockResolvedValueOnce(new Response(`${signal}\n`));
	vi.stubGlobal("fetch", fetch);
	const origin = "https://pr-1175-evame-start.reimei.workers.dev";
	await expect(readPreviewSignal(origin, signal)).resolves.toBeNull();
	await expect(readPreviewSignal(origin, signal)).resolves.toBe(signal);
});
