// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { postMonitoring } from "./handler";

afterEach(() => vi.unstubAllGlobals());
describe("Sentryのtunnel", () => {
	it("指定したプロジェクトのバイナリenvelopeを変更せず転送する", async () => {
		const prefix = new TextEncoder().encode(
			'{"dsn":"https://0cda4c09dab97bb05116614428effb0c@o4507906314207232.ingest.us.sentry.io/4508805630263296"}\n',
		);
		const body = new Uint8Array([...prefix, 255, 0, 128]);
		const fetch = vi.fn(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetch);
		expect(
			(
				await postMonitoring(
					new Request("https://evame.test/monitoring", {
						method: "POST",
						body,
					}),
				)
			).status,
		).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			"https://o4507906314207232.ingest.us.sentry.io/api/4508805630263296/envelope/",
			{
				method: "POST",
				headers: { "Content-Type": "application/x-sentry-envelope" },
				body: body.buffer,
			},
		);
	});
	it.each([
		'{"dsn":"https://evil.test/key"}\n',
		"invalid\n",
		"null\n",
		'{"dsn":"https://0cda4c09dab97bb05116614428effb0c@o4507906314207232.ingest.us.sentry.io/4508805630263296"} ',
	])("別の送信先や壊れたenvelopeは400で拒否する", async (body) => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		expect(
			(
				await postMonitoring(
					new Request("https://evame.test/monitoring", {
						method: "POST",
						body,
					}),
				)
			).status,
		).toBe(400);
		expect(fetch).not.toHaveBeenCalled();
	});
});
