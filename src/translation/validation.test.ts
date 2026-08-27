import { describe, expect, it } from "vitest";
import { InvalidInputError } from "@/domain/errors";
import {
	parseTranslationJobRequest,
	parseTranslationQueueMessage,
} from "./validation";

describe("翻訳ジョブ入力検証", () => {
	it("グローバルなlocaleとtranslation contextを保持する", () => {
		expect(
			parseTranslationJobRequest({
				scriptureId: 42,
				locale: "pt",
				model: "gpt-5-nano-2025-08-07",
				translationContext: "Use the established Buddhist terminology.",
				sessionToken: "session",
			}),
		).toEqual({
			scriptureId: 42,
			locale: "pt",
			model: "gpt-5-nano-2025-08-07",
			translationContext: "Use the established Buddhist terminology.",
			sessionToken: "session",
		});
	});

	it("正本にないlocaleをジョブとQueue payloadの両方で拒否する", () => {
		expect(() =>
			parseTranslationJobRequest({
				scriptureId: 42,
				locale: "pt-BR",
				model: "gemini-2.0-flash",
				sessionToken: "session",
			}),
		).toThrow(InvalidInputError);
		expect(() =>
			parseTranslationQueueMessage({
				kind: "translation-chunk",
				jobId: "job-1",
				chunkId: "job-1-c0",
				chunkIndex: 0,
				totalChunks: 1,
				scriptureId: 42,
				locale: "eo",
				model: "gemini-2.5-flash",
				segments: [{ id: 1, number: 0, text: "Dhamma" }],
			}),
		).toThrow(InvalidInputError);
	});

	it("記事用pageIdや不正modelを受け付けない", () => {
		expect(() =>
			parseTranslationJobRequest({
				pageId: 1,
				locale: "ja",
				model: "gpt-5",
				translationContext: "",
				sessionToken: "session",
			}),
		).toThrow(InvalidInputError);
		expect(() =>
			parseTranslationJobRequest({
				scriptureId: 1,
				locale: "ja",
				model: "some-provider-model",
				translationContext: "",
				sessionToken: "session",
			}),
		).toThrow(InvalidInputError);
	});

	it("whitelistにないprovider modelを受け付けない", () => {
		for (const model of ["gpt-5", "deepseek-chat", "gemini-2.5-pro"]) {
			expect(() =>
				parseTranslationJobRequest({
					scriptureId: 1,
					locale: "ja",
					model,
					translationContext: "",
					sessionToken: "session",
				}),
			).toThrow(InvalidInputError);
		}
	});

	it("Queue payloadの未知フィールドを捨て、チャンクの番号を検証する", () => {
		expect(
			parseTranslationQueueMessage({
				kind: "translation-chunk",
				jobId: "job-1",
				chunkId: "job-1-c0",
				chunkIndex: 0,
				totalChunks: 1,
				scriptureId: 42,
				locale: "de",
				model: "gemini-2.5-flash",
				translationContext: "",
				segments: [{ id: 1, number: 0, text: "Dhamma" }],
				secret: "must be ignored",
			}),
		).toEqual({
			kind: "translation-chunk",
			jobId: "job-1",
			chunkId: "job-1-c0",
			chunkIndex: 0,
			totalChunks: 1,
			scriptureId: 42,
			locale: "de",
			model: "gemini-2.5-flash",
			translationContext: "",
			segments: [{ id: 1, number: 0, text: "Dhamma" }],
		});
	});
});
