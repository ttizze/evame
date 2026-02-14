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

import { runCommand } from "./commands";

describe("evame-cli commands", () => {
	beforeEach(() => {
		loginWithBrowserMock.mockReset();
		saveAuthTokenMock.mockReset();
		resolveAuthFilePathMock.mockClear();
		clearAuthTokenMock.mockReset();
		loadAuthTokenMock.mockReset();
		loadOrCreateConfigMock.mockReset();
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
			expect(printed).toContain("evame pull");
		} finally {
			logSpy.mockRestore();
		}
	});
});
