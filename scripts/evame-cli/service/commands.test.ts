import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginWithBrowserMock } = vi.hoisted(() => {
	return { loginWithBrowserMock: vi.fn() };
});
vi.mock("../infra/browser-login", () => {
	return { loginWithBrowser: loginWithBrowserMock };
});

const {
	saveAuthTokenMock,
	resolveAuthFilePathMock,
	clearAuthTokenMock,
	loadAuthTokenMock,
} = vi.hoisted(() => {
	return {
		saveAuthTokenMock: vi.fn(),
		resolveAuthFilePathMock: vi.fn(() => "/tmp/evame/auth.json"),
		clearAuthTokenMock: vi.fn(),
		loadAuthTokenMock: vi.fn(),
	};
});
vi.mock("./auth", () => {
	return {
		saveAuthToken: saveAuthTokenMock,
		resolveAuthFilePath: resolveAuthFilePathMock,
		clearAuthToken: clearAuthTokenMock,
		loadAuthToken: loadAuthTokenMock,
	};
});

const { loadOrCreateConfigMock } = vi.hoisted(() => {
	return {
		loadOrCreateConfigMock: vi.fn(),
	};
});
vi.mock("./config", () => {
	return { loadOrCreateConfig: loadOrCreateConfigMock };
});

const { collectMarkdownFilesMock } = vi.hoisted(() => {
	return { collectMarkdownFilesMock: vi.fn() };
});
vi.mock("./markdown", () => {
	return { collectMarkdownFiles: collectMarkdownFilesMock };
});

const { loadStateMock, saveStateMock, applyPullResultToLocalMock } = vi.hoisted(
	() => {
		return {
			loadStateMock: vi.fn(),
			saveStateMock: vi.fn(),
			applyPullResultToLocalMock: vi.fn(),
		};
	},
);
vi.mock("./state", () => {
	return {
		loadState: loadStateMock,
		saveState: saveStateMock,
		applyPullResultToLocal: applyPullResultToLocalMock,
	};
});

const { buildPushRequestMock, applyPushResultToStateMock } = vi.hoisted(() => {
	return {
		buildPushRequestMock: vi.fn(),
		applyPushResultToStateMock: vi.fn(),
	};
});
vi.mock("../domain/sync-state", () => {
	return {
		buildPushRequest: buildPushRequestMock,
		applyPushResultToState: applyPushResultToStateMock,
	};
});

const { requestPushMock, requestPullMock } = vi.hoisted(() => {
	return { requestPushMock: vi.fn(), requestPullMock: vi.fn() };
});
vi.mock("../infra/sync-api", () => {
	return { requestPush: requestPushMock, requestPull: requestPullMock };
});

import { runCommand } from "./commands";

describe("evame-cli commands", () => {
	beforeEach(() => {
		loginWithBrowserMock.mockReset();
		saveAuthTokenMock.mockReset();
		resolveAuthFilePathMock.mockClear();
		clearAuthTokenMock.mockReset();
		loadAuthTokenMock.mockReset();
		loadOrCreateConfigMock.mockReset();
		collectMarkdownFilesMock.mockReset();
		loadStateMock.mockReset();
		saveStateMock.mockReset();
		applyPullResultToLocalMock.mockReset();
		buildPushRequestMock.mockReset();
		applyPushResultToStateMock.mockReset();
		requestPushMock.mockReset();
		requestPullMock.mockReset();
	});

	it("--helpでhelpを表示して終了する", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		try {
			const code = await runCommand("--help", []);
			expect(code).toBe(0);

			const printed = logSpy.mock.calls
				.map((call: unknown[]) => String(call[0]))
				.join("\n");
			expect(printed).toContain("Usage:");
			expect(printed).toContain("evame help");
		} finally {
			logSpy.mockRestore();
		}
	});

	it("push --helpでもhelpを表示して終了する", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		try {
			const code = await runCommand("push", ["--help"]);
			expect(code).toBe(0);

			const printed = logSpy.mock.calls
				.map((call: unknown[]) => String(call[0]))
				.join("\n");
			expect(printed).toContain("Usage:");
		} finally {
			logSpy.mockRestore();
		}
	});

	it("pushで同期対象が無いときは0で終了し、APIを呼ばない", async () => {
		loadOrCreateConfigMock.mockResolvedValue({
			config: { content_dir: "." },
			created: false,
		});
		loadAuthTokenMock.mockResolvedValue("token-123");
		loadStateMock.mockResolvedValue({ slugs: {} });
		collectMarkdownFilesMock.mockResolvedValue([]);
		buildPushRequestMock.mockReturnValue({ inputs: [] });

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		try {
			const code = await runCommand("push", []);
			expect(code).toBe(0);
			expect(requestPushMock).not.toHaveBeenCalled();
			expect(saveStateMock).not.toHaveBeenCalled();

			const printed = logSpy.mock.calls
				.map((call: unknown[]) => String(call[0]))
				.join("\n");
			expect(printed).toContain("No files to sync.");
		} finally {
			logSpy.mockRestore();
		}
	});

	it("push --dry-runはstateを保存せずにAPIを呼ぶ", async () => {
		loadOrCreateConfigMock.mockResolvedValue({
			config: { content_dir: "." },
			created: false,
		});
		loadAuthTokenMock.mockResolvedValue("token-123");
		loadStateMock.mockResolvedValue({ slugs: {} });
		collectMarkdownFilesMock.mockResolvedValue([
			{
				slug: "hello",
				title: "Hello",
				body: "body",
				published_at: null,
			},
		]);
		buildPushRequestMock.mockReturnValue({
			dry_run: true,
			inputs: [
				{
					slug: "hello",
					expected_revision: null,
					title: "Hello",
					body: "body",
					published_at: null,
				},
			],
		});
		requestPushMock.mockResolvedValue({
			status: "applied",
			results: [{ slug: "hello", action: "AUTO_APPLY", detail: "UPSERT" }],
		});
		applyPushResultToStateMock.mockReturnValue({ slugs: {} });

		const code = await runCommand("push", ["--dry-run"]);
		expect(code).toBe(0);
		expect(buildPushRequestMock).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Object),
			true,
		);
		expect(requestPushMock).toHaveBeenCalledWith(
			expect.any(String),
			"token-123",
			expect.objectContaining({ dry_run: true }),
		);
		expect(saveStateMock).not.toHaveBeenCalled();
	});

	it("push成功時はstateを保存して0で終了する", async () => {
		loadOrCreateConfigMock.mockResolvedValue({
			config: { content_dir: "." },
			created: false,
		});
		loadAuthTokenMock.mockResolvedValue("token-123");
		loadStateMock.mockResolvedValue({ slugs: {} });
		collectMarkdownFilesMock.mockResolvedValue([
			{
				slug: "hello",
				title: "Hello",
				body: "body",
				published_at: null,
			},
		]);
		buildPushRequestMock.mockReturnValue({
			inputs: [
				{
					slug: "hello",
					expected_revision: null,
					title: "Hello",
					body: "body",
					published_at: null,
				},
			],
		});
		requestPushMock.mockResolvedValue({
			status: "applied",
			results: [{ slug: "hello", action: "AUTO_APPLY", detail: "UPSERT" }],
		});
		applyPushResultToStateMock.mockReturnValue({
			slugs: { hello: { last_applied_revision: "rev-1" } },
		});

		const code = await runCommand("push", []);
		expect(code).toBe(0);
		expect(saveStateMock).toHaveBeenCalledWith(expect.any(String), {
			slugs: { hello: { last_applied_revision: "rev-1" } },
		});
	});

	it("pushがconflictなら1で終了する", async () => {
		loadOrCreateConfigMock.mockResolvedValue({
			config: { content_dir: "." },
			created: false,
		});
		loadAuthTokenMock.mockResolvedValue("token-123");
		loadStateMock.mockResolvedValue({ slugs: {} });
		collectMarkdownFilesMock.mockResolvedValue([
			{
				slug: "hello",
				title: "Hello",
				body: "body",
				published_at: null,
			},
		]);
		buildPushRequestMock.mockReturnValue({
			inputs: [
				{
					slug: "hello",
					expected_revision: null,
					title: "Hello",
					body: "body",
					published_at: null,
				},
			],
		});
		requestPushMock.mockResolvedValue({
			status: "conflict",
			results: [
				{
					slug: "hello",
					action: "CONFLICT",
					reason: "revision_mismatch",
				},
			],
		});
		applyPushResultToStateMock.mockReturnValue({ slugs: {} });

		const code = await runCommand("push", []);
		expect(code).toBe(1);
	});

	it("login成功後に次に打つコマンドを表示する", async () => {
		loadOrCreateConfigMock.mockResolvedValue({
			config: { content_dir: "." },
			created: false,
		});
		loginWithBrowserMock.mockResolvedValue("token-123");
		saveAuthTokenMock.mockResolvedValue(undefined);

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		try {
			const code = await runCommand("login", []);
			expect(code).toBe(0);
			expect(saveAuthTokenMock).toHaveBeenCalledWith(
				"token-123",
				expect.anything(),
			);

			const printed = logSpy.mock.calls
				.map((call: unknown[]) => String(call[0]))
				.join("\n");
			expect(printed).toContain("Login successful.");
			expect(printed).toContain("Next:");
			expect(printed).toContain("evame push");
			expect(printed).toContain("evame push --dry-run");
			expect(printed).toContain("evame pull");
			expect(printed).toContain("evame pull --force");
		} finally {
			logSpy.mockRestore();
		}
	});
});
