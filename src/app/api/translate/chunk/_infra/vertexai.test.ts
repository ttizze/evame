// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleAccessToken } from "./google-auth";
import { getVertexAIModelResponse } from "./vertexai";

vi.mock("./google-auth", () => ({
	getGoogleAccessToken: vi.fn(async () => "dummy-access-token"),
}));
const parameters = {
	model: "gemini-2.5-flash",
	title: "記事の題名",
	sourceText: '[{"number":0,"text":"本文"}]',
	targetLocale: "en",
	translationContext: "用語を統一する",
};
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

describe("WorkersからVertex AIで翻訳する", () => {
	it("既存のプロンプト・安全設定・JSONスキーマを維持して翻訳を取得する", async () => {
		vi.stubEnv("GCP_PROJECT_ID", "test-project");
		vi.stubEnv("GCP_REGION", "asia-northeast1");
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({
				candidates: [
					{
						content: { parts: [{ text: ' [{"number":0,"text":"Text"}] ' }] },
					},
				],
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
		expect(await getVertexAIModelResponse(parameters)).toBe(
			'[{"number":0,"text":"Text"}]',
		);
		expect(getGoogleAccessToken).toHaveBeenCalled();
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(
			"https://asia-northeast1-aiplatform.googleapis.com/v1/projects/test-project/locations/asia-northeast1/publishers/google/models/gemini-2.5-flash:generateContent",
		);
		expect(options?.headers).toEqual({
			Authorization: "Bearer dummy-access-token",
			"Content-Type": "application/json",
		});
		const request = JSON.parse(options?.body as string);
		expect(request.contents[0].parts[0].text).toContain(
			"Document title: 記事の題名",
		);
		expect(request.contents[0].parts[0].text).toContain("用語を統一する");
		expect(request.generationConfig).toMatchObject({
			maxOutputTokens: 65535,
			responseMimeType: "application/json",
			responseSchema: {
				type: "ARRAY",
				items: { required: ["number", "text"] },
			},
		});
		expect(request.safetySettings).toHaveLength(4);
		expect(
			request.safetySettings.every(
				(setting: { threshold: string }) =>
					setting.threshold === "BLOCK_ONLY_HIGH",
			),
		).toBe(true);
	});
	it("レート制限後は30秒待ち、既定リージョンで再試行する", async () => {
		vi.useFakeTimers();
		vi.stubEnv("GCP_PROJECT_ID", "test-project");
		vi.stubEnv("GCP_REGION", "");
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status: 429 }))
			.mockResolvedValueOnce(
				Response.json({
					candidates: [{ content: { parts: [{ text: "[]" }] } }],
				}),
			);
		vi.stubGlobal("fetch", fetchMock);
		const pending = getVertexAIModelResponse({
			...parameters,
			model: "gemini-2.0-flash",
		});
		await vi.advanceTimersByTimeAsync(29999);
		expect(fetchMock).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(1);
		expect(await pending).toBe("[]");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1][0]).toContain(
			"us-central1-aiplatform.googleapis.com",
		);
		expect(
			JSON.parse(fetchMock.mock.calls[1][1]?.body as string).generationConfig
				.maxOutputTokens,
		).toBe(8192);
	});
	it("空の応答は3回再試行してエラーを通知する", async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => Response.json({ candidates: [] }));
		vi.stubGlobal("fetch", fetchMock);
		const pending = expect(
			getVertexAIModelResponse(parameters),
		).rejects.toThrow("Empty response from Vertex AI");
		await vi.runAllTimersAsync();
		await pending;
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
