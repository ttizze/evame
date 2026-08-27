import { describe, expect, it, vi } from "vitest";
import type { ScriptureDetail as ServerScriptureDetail } from "@/server/scriptures";

const state = vi.hoisted(() => ({
	request: new Request("https://example.test/ja/source"),
	database: {},
	listScriptures: vi.fn(),
	getScripture: vi.fn(),
	addTranslation: vi.fn(),
	deleteTranslation: vi.fn(),
	voteTranslation: vi.fn(),
	createAndEnqueueTranslationJob: vi.fn(),
	parseTranslationJobRequest: vi.fn(),
	translationQueue: { send: vi.fn() },
	getTranslationJob: vi.fn(),
	getSessionUser: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let validator: unknown;
		const builder = {
			validator(nextValidator: (input: unknown) => unknown) {
				validator = nextValidator;
				return builder;
			},
			handler(serverHandler: (input: { data: unknown }) => unknown) {
				return vi.fn(async (options: { data: unknown }) =>
					serverHandler({
						data:
							typeof validator === "function"
								? validator(options.data)
								: validator &&
										typeof validator === "object" &&
										"parse" in validator &&
										typeof validator.parse === "function"
									? validator.parse(options.data)
									: options.data,
					}),
				);
			},
		};
		return builder;
	},
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => state.request,
}));

vi.mock("@/server/runtime", () => ({
	getDatabase: () => state.database,
}));
vi.mock("@/server/scriptures", () => ({
	getScripture: state.getScripture,
	listScriptures: state.listScriptures,
}));
vi.mock("@/auth/session", () => ({
	getSessionUser: state.getSessionUser,
}));
vi.mock("@/server/translations", () => ({
	addTranslation: state.addTranslation,
	deleteTranslation: state.deleteTranslation,
}));
vi.mock("@/server/votes", () => ({
	voteTranslation: state.voteTranslation,
}));
vi.mock("@/server/translation-jobs", () => ({
	getTranslationJob: state.getTranslationJob,
}));
vi.mock("@/translation/service", () => ({
	createAndEnqueueTranslationJob: state.createAndEnqueueTranslationJob,
}));
vi.mock("@/translation/validation", () => ({
	parseTranslationJobRequest: state.parseTranslationJobRequest,
}));
vi.mock("@/translation/runtime", () => ({
	getTranslationQueue: () => state.translationQueue,
}));

import {
	createTranslation,
	createTranslationJob,
	deleteTranslation,
	getScripture,
	listScriptures,
	mapScriptureDetail,
	supportedLocales,
	voteTranslation,
} from "./-scripture-data";

const serverDetail: ServerScriptureDetail = {
	id: 7,
	slug: "runtime-source",
	title: "Runtime source",
	sourceLocale: "pi",
	displayLocale: "ja",
	hierarchy: ["Collection", "Runtime source"],
	sourceText: "Pāli source from the server",
	segments: [
		{
			id: 70,
			kind: "PRIMARY",
			position: 0,
			sourceText: "Pāli source from the server",
			translations: [
				{
					id: 700,
					segmentId: 70,
					locale: "ja",
					text: "サーバーから取得した訳",
					point: 4,
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
					userId: "translator",
					source: "USER",
					aiJobId: null,
					ownerUpvoted: false,
					votedByViewer: true,
					userName: "Translator",
					userHandle: "translator",
					userProfile: "",
					userIsAi: false,
					userTotalPoints: 12,
					ownedByViewer: false,
				},
			],
		},
		{
			id: 71,
			kind: "PRIMARY",
			position: 1,
			sourceText: "Second Pāli source",
			translations: [],
		},
		{
			id: 72,
			kind: "COMMENTARY",
			position: 2,
			sourceText: "Annotation from the server",
			translations: [],
		},
	],
	translations: [
		{
			id: 700,
			segmentId: 70,
			locale: "ja",
			text: "サーバーから取得した訳",
			point: 4,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			userId: "translator",
			source: "USER",
			aiJobId: null,
			ownerUpvoted: false,
			votedByViewer: true,
			userName: "Translator",
			userHandle: "translator",
			userProfile: "",
			userIsAi: false,
			userTotalPoints: 12,
			ownedByViewer: false,
		},
	],
	annotationLinks: [
		{
			mainSegmentId: 70,
			annotationSegmentId: 72,
			createdAt: "2026-01-02T00:00:00.000Z",
		},
	],
	availableLocales: [
		{ code: "en", label: "English" },
		{ code: "ja", label: "日本語" },
	],
};

describe("仏典ルートのserver function adapter", () => {
	it("現行の21言語をネイティブラベル付きで正本として公開する", () => {
		expect(supportedLocales).toEqual([
			{ code: "en", label: "English" },
			{ code: "zh", label: "中文" },
			{ code: "es", label: "Español" },
			{ code: "ar", label: "العربية" },
			{ code: "id", label: "Bahasa Indonesia" },
			{ code: "pt", label: "Português" },
			{ code: "fr", label: "Français" },
			{ code: "ja", label: "日本語" },
			{ code: "ru", label: "Русский" },
			{ code: "de", label: "Deutsch" },
			{ code: "vi", label: "Tiếng Việt" },
			{ code: "ko", label: "한국어" },
			{ code: "tr", label: "Türkçe" },
			{ code: "it", label: "Italiano" },
			{ code: "fa", label: "فارسی" },
			{ code: "th", label: "ไทย" },
			{ code: "pl", label: "Polski" },
			{ code: "nl", label: "Nederlands" },
			{ code: "tl", label: "Filipino" },
			{ code: "hi", label: "हिन्दी" },
			{ code: "pi", label: "Pāli" },
		]);
	});

	it("サーバーの一覧結果だけをUI型へ変換し、固定サンプルを返さない", async () => {
		state.listScriptures.mockResolvedValue([
			{
				id: 42,
				slug: "runtime-slug",
				title: "Runtime title",
				sourceLocale: "pi",
				hierarchy: ["Runtime collection"],
				translationCount: 3,
				href: "/ja/runtime-slug",
			},
		]);

		await expect(listScriptures({ data: { locale: "ja" } })).resolves.toEqual([
			{
				id: "42",
				slug: "runtime-slug",
				title: "Runtime title",
				hierarchy: ["Runtime collection"],
				translationCount: 3,
				href: "/ja/runtime-slug",
			},
		]);
		expect(state.listScriptures).toHaveBeenCalledWith(state.database, {
			locale: "ja",
		});
	});

	it("未対応localeをserver functionの入力境界で拒否する", async () => {
		await expect(listScriptures({ data: { locale: "eo" } })).rejects.toThrow();
		await expect(
			getScripture({ data: { locale: "pt-BR", slug: "runtime-source" } }),
		).rejects.toThrow();
		await expect(
			createTranslation({
				data: { locale: "eo", segmentId: 70, text: "Translation" },
			}),
		).rejects.toThrow();
		await expect(
			createTranslationJob({ data: { locale: "eo", scriptureId: 7 } }),
		).rejects.toThrow();
		expect(state.listScriptures).not.toHaveBeenCalledWith(state.database, {
			locale: "eo",
		});
		expect(state.getScripture).not.toHaveBeenCalledWith(state.database, {
			locale: "pt-BR",
			slug: "runtime-source",
		});
	});

	it("詳細結果を変換し、Better Authの検証済みユーザーIDを渡す", async () => {
		state.request = new Request("https://example.test/ja/runtime-source", {
			headers: { cookie: "digital_buddhism_session=reader-token" },
		});
		state.getScripture.mockResolvedValue(serverDetail);
		state.getSessionUser.mockResolvedValue({ id: "reader" });

		await expect(
			getScripture({ data: { locale: "ja", slug: "runtime-source" } }),
		).resolves.toMatchObject({
			id: "7",
			primarySegmentId: "70",
			authenticated: true,
			availableLocales: supportedLocales,
			translations: [
				{
					id: "700",
					voteCount: 4,
					votedByViewer: true,
					userName: "Translator",
					userHandle: "translator",
					userProfile: "",
					userIsAi: false,
					userTotalPoints: 12,
					ownedByViewer: false,
					source: "USER",
				},
			],
			segments: [
				{
					id: "70",
					kind: "PRIMARY",
					translations: [{ id: "700" }],
				},
				{ id: "71", kind: "PRIMARY", translations: [] },
				{ id: "72", kind: "COMMENTARY", translations: [] },
			],
			annotationLinks: [
				{
					mainSegmentId: "70",
					annotationSegmentId: "72",
				},
			],
		});
		expect(state.getSessionUser).toHaveBeenCalledWith(state.request);
		expect(state.getScripture).toHaveBeenCalledWith(state.database, {
			locale: "ja",
			viewerUserId: "reader",
			slug: "runtime-source",
		});
	});

	it("検証済みユーザーIDをmutationへ渡し、未認証ならDB mutationを呼ばない", async () => {
		state.request = new Request("https://example.test/ja/runtime-source", {
			headers: { cookie: "digital_buddhism_session=writer-token" },
		});
		state.getSessionUser.mockResolvedValue({ id: "writer" });
		state.addTranslation.mockResolvedValue(serverDetail.translations[0]);

		await createTranslation({
			data: { locale: "ja", segmentId: 70, text: "新しい訳" },
		});
		expect(state.addTranslation).toHaveBeenCalledWith(state.database, {
			locale: "ja",
			segmentId: 70,
			text: "新しい訳",
			userId: "writer",
		});

		state.request = new Request("https://example.test/ja/runtime-source");
		state.getSessionUser.mockResolvedValue(null);
		await expect(
			createTranslation({
				data: { locale: "ja", segmentId: 70, text: "拒否される訳" },
			}),
		).rejects.toThrow("認証が必要です");
		expect(state.addTranslation).toHaveBeenCalledTimes(1);
	});

	it("投票結果をUIの票数と現在票へ変換する", async () => {
		state.request = new Request("https://example.test/ja/runtime-source", {
			headers: { cookie: "digital_buddhism_session=voter-token" },
		});
		state.getSessionUser.mockResolvedValue({ id: "voter" });
		state.voteTranslation.mockResolvedValue({
			translationId: 700,
			point: 5,
			isUpvote: true,
		});

		await expect(
			voteTranslation({
				data: { isUpvote: true, translationId: 700 },
			}),
		).resolves.toEqual({ voted: true, voteCount: 5 });
		expect(state.voteTranslation).toHaveBeenCalledWith(state.database, {
			isUpvote: true,
			translationId: 700,
			userId: "voter",
		});
	});

	it("認証済みユーザーIDを候補削除へ渡し、未認証では呼び出さない", async () => {
		state.request = new Request("https://example.test/ja/runtime-source", {
			headers: { cookie: "digital_buddhism_session=owner-token" },
		});
		state.getSessionUser.mockResolvedValue({ id: "owner" });

		await expect(
			deleteTranslation({ data: { translationId: 700 } }),
		).resolves.toEqual({ success: true });
		expect(state.deleteTranslation).toHaveBeenCalledWith(state.database, {
			translationId: 700,
			userId: "owner",
		});

		state.request = new Request("https://example.test/ja/runtime-source");
		state.getSessionUser.mockResolvedValue(null);
		await expect(
			deleteTranslation({ data: { translationId: 700 } }),
		).rejects.toThrow("認証が必要です");
		expect(state.deleteTranslation).toHaveBeenCalledTimes(1);
	});

	it("AI翻訳ジョブを既定モデルで公開APIへ渡し、Queue依存を注入する", async () => {
		state.request = new Request("https://example.test/ja/runtime-source", {
			headers: { cookie: "digital_buddhism_session=job-token" },
		});
		state.getSessionUser.mockResolvedValue({ id: "job-owner" });
		state.parseTranslationJobRequest.mockImplementation(
			(input: Record<string, unknown>, userId: string) => ({
				...input,
				userId,
			}),
		);
		state.createAndEnqueueTranslationJob.mockResolvedValue({
			id: "job-1",
			status: "PENDING",
		});

		await expect(
			createTranslationJob({ data: { locale: "ja", scriptureId: 7 } }),
		).resolves.toEqual({ id: "job-1", status: "PENDING" });

		expect(state.parseTranslationJobRequest).toHaveBeenCalledWith(
			{
				scriptureId: 7,
				locale: "ja",
				model: "gemini-2.0-flash",
				translationContext: "",
			},
			"job-owner",
		);
		expect(state.createAndEnqueueTranslationJob).toHaveBeenCalledWith(
			state.database,
			state.translationQueue,
			{
				scriptureId: 7,
				locale: "ja",
				model: "gemini-2.0-flash",
				translationContext: "",
				userId: "job-owner",
			},
		);
	});

	it("Pāli原文タイトルはサーバーのsource localeがPāliのときだけ補助表示する", () => {
		expect(mapScriptureDetail(serverDetail).paliTitle).toBe("Runtime source");
		expect(
			mapScriptureDetail({ ...serverDetail, sourceLocale: "en" }).paliTitle,
		).toBeUndefined();
	});
});
