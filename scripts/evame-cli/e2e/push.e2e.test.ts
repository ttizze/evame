import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestPushMock } = vi.hoisted(() => {
	return { requestPushMock: vi.fn() };
});
vi.mock("../infra/sync-api", () => {
	return {
		requestPush: requestPushMock,
		requestPull: vi.fn(),
	};
});

import { runCommand } from "../service/commands";

describe("evame-cli push (e2e)", () => {
	let originalCwd: string;
	let tempDir: string;
	let originalEvamePat: string | undefined;
	let originalEvameBaseUrl: string | undefined;

	beforeEach(async () => {
		originalCwd = process.cwd();
		tempDir = await mkdtemp(join(tmpdir(), "evame-cli-push-e2e-"));
		process.chdir(tempDir);

		originalEvamePat = process.env.EVAME_PAT;
		originalEvameBaseUrl = process.env.EVAME_BASE_URL;
		process.env.EVAME_PAT = "token-123";
		process.env.EVAME_BASE_URL = "http://example.test";

		requestPushMock.mockReset();
	});

	afterEach(async () => {
		process.chdir(originalCwd);

		if (originalEvamePat === undefined) {
			delete process.env.EVAME_PAT;
		} else {
			process.env.EVAME_PAT = originalEvamePat;
		}

		if (originalEvameBaseUrl === undefined) {
			delete process.env.EVAME_BASE_URL;
		} else {
			process.env.EVAME_BASE_URL = originalEvameBaseUrl;
		}

		await rm(tempDir, { recursive: true, force: true });
	});

	it("published_at frontmatterのあるMarkdownだけをpush対象にして送る", async () => {
		await writeFile(
			join(tempDir, "a.md"),
			[
				"---",
				"published_at: null",
				"---",
				"",
				"# 見出しA",
				"",
				"本文A",
				"",
			].join("\n"),
			"utf8",
		);

		await writeFile(
			join(tempDir, "b.md"),
			[
				"---",
				'title: "IGNORED"',
				'published_at: "2026-01-01T00:00:00.000Z"',
				"---",
				"",
				"タイトル行B",
				"本文B",
				"",
			].join("\n"),
			"utf8",
		);

		await writeFile(
			join(tempDir, "ignored-no-frontmatter.md"),
			["# 無視", "", "本文です。", ""].join("\n"),
			"utf8",
		);

		await writeFile(
			join(tempDir, "ignored-no-published-at.md"),
			["---", 'title: "nope"', "---", "", "# 無視", ""].join("\n"),
			"utf8",
		);

		await writeFile(
			join(tempDir, "ignored-empty-body.md"),
			["---", "published_at: null", "---", ""].join("\n"),
			"utf8",
		);

		requestPushMock.mockImplementation(
			async (
				_baseUrl: string,
				_token: string,
				payload: {
					dry_run?: boolean;
					inputs: Array<{ slug: string }>;
				},
			) => {
				return {
					status: "applied" as const,
					results: payload.inputs.map((input) => ({
						slug: input.slug,
						action: "AUTO_APPLY" as const,
						detail: "UPSERT" as const,
					})),
				};
			},
		);

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		try {
			const code = await runCommand("push", ["--dry-run"]);
			expect(code).toBe(0);
		} finally {
			logSpy.mockRestore();
		}

		expect(requestPushMock).toHaveBeenCalledTimes(1);
		expect(requestPushMock.mock.calls[0]?.[2]).toEqual({
			dry_run: true,
			inputs: [
				{
					slug: "a",
					expected_revision: null,
					title: "見出しA",
					body: "本文A\n",
					published_at: null,
				},
				{
					slug: "b",
					expected_revision: null,
					title: "タイトル行B",
					body: "タイトル行B\n本文B\n",
					published_at: "2026-01-01T00:00:00.000Z",
				},
			],
		});
	});
});
