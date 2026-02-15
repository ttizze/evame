import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printContentDirInfo, printHelp, printPushSummary } from "./output";

describe("evame-cli output", () => {
	let logSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	it("helpは英語で表示される", () => {
		printHelp();
		const printed = logSpy.mock.calls
			.map((call: unknown[]) => String(call[0]))
			.join("\n");

		expect(printed).toContain("Authentication:");
		expect(printed).toContain("Use `evame login` for browser-based login");
		// オプションはコピーしやすいよう、角括弧ではなく実行可能なコマンド行で示す。
		expect(printed).toContain("evame push --dry-run");
		expect(printed).toContain("evame pull --force");
		expect(printed).not.toContain("push [--dry-run]");
		expect(printed).not.toContain("pull [--force]");
	});

	it("push summaryは英語で表示される", () => {
		printPushSummary(
			{
				status: "applied",
				results: [
					{ slug: "post-1", action: "AUTO_APPLY", detail: "UPSERT" },
					{ slug: "post-2", action: "NO_CHANGE" },
					{ slug: "post-3", action: "CONFLICT", reason: "revision_mismatch" },
				],
			},
			true,
		);

		expect(logSpy.mock.calls[0]?.[0]).toBe("[dry-run] Push result: applied");
		expect(logSpy.mock.calls[1]?.[0]).toBe("  - post-1: applied (UPSERT)");
		expect(logSpy.mock.calls[2]?.[0]).toBe("  - post-2: no_change");
		expect(logSpy.mock.calls[3]?.[0]).toBe(
			"  - post-3: conflict (revision_mismatch)",
		);
	});

	it("content directory infoは英語で表示される", () => {
		printContentDirInfo("/work", "/work/articles", "./articles", true);
		const printed = logSpy.mock.calls
			.map((call: unknown[]) => String(call[0]))
			.join("\n");

		expect(printed).toContain(
			"Created config file automatically: /work/.evame/config.json",
		);
		expect(printed).toContain(
			"Why: this file stores the default sync target for push/pull.",
		);
		expect(printed).toContain("Sync target directory: /work/articles");
		expect(printed).toContain(
			"Config: /work/.evame/config.json (content_dir=./articles)",
		);
		expect(printed).toContain(
			"Tip: edit content_dir in /work/.evame/config.json before running push/pull.",
		);
	});
});
