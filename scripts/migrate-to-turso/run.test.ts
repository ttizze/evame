import { describe, expect, it, vi } from "vitest";
import { runMigration, safeErrorMessage } from "./run";
import type { PostgresSource } from "./source";
import type { TursoConnection } from "./target";
import type { SourceSnapshot } from "./types";

function makeSnapshot(): SourceSnapshot {
	return {
		pages: [
			{
				id: 1,
				contentKind: "PAGE",
				slug: "tipitaka",
				title: "Tipitaka",
				sourceLocale: "pi",
				parentId: null,
				position: 0,
				status: "PUBLIC",
				publishedAt: null,
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
		segments: [],
		translations: [],
		translationJobs: [],
		users: [],
		votes: [],
		annotationLinks: [],
	};
}

function makeSource(): PostgresSource {
	return {
		load: vi.fn(async () => makeSnapshot()),
		close: vi.fn(async () => {}),
	};
}

describe("runMigration", () => {
	it("接続URLと秘密らしいエラー値をCLI向け文面から除去する", () => {
		const message = safeErrorMessage(
			new Error(
				"request failed https://user:pass@example.test/db?authToken=secret&foo=value password=another-secret",
			),
		);

		expect(message).not.toContain("pass@example");
		expect(message).not.toContain("secret");
		expect(message).not.toContain("another-secret");
		expect(message).toContain("[redacted]");
	});

	it("dry-runではTurso接続と書き込みを行わず件数だけ報告する", async () => {
		const source = makeSource();
		const output: string[] = [];

		const result = await runMigration({
			dryRun: true,
			source,
			stdout: (line) => output.push(line),
		});

		expect(result.actualCounts).toBeNull();
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({ mode: "dry-run" });
		expect(source.load).toHaveBeenCalledWith("tipitaka");
		expect(source.close).not.toHaveBeenCalled();
	});

	it("本実行ではupsert後に対象キーの件数を検証する", async () => {
		const source = makeSource();
		const output: string[] = [];
		const report = {
			users: 0,
			scriptures: 1,
			segments: 0,
			translations: 0,
			translationJobs: 0,
			translationVotes: 0,
			annotationLinks: 0,
		};
		const target: TursoConnection = {
			batch: vi.fn(async () => {}),
			all: vi.fn(async (sql) => {
				const table = /FROM ([a-z_]+)/.exec(sql)?.[1];
				const key =
					table === "translation_jobs"
						? "translationJobs"
						: (table?.replace(/_([a-z])/g, (_, letter: string) =>
								letter.toUpperCase(),
							) as keyof typeof report);
				return { rows: [{ count: report[key] ?? 0 }] };
			}),
		};

		const result = await runMigration({
			source,
			target,
			stdout: (line) => output.push(line),
		});

		expect(result.actualCounts).toEqual(report);
		expect(target.batch).toHaveBeenCalledTimes(1);
		expect(target.all).toHaveBeenCalledTimes(1);
		expect(output.map((line) => JSON.parse(line))).toEqual([
			expect.objectContaining({ mode: "apply" }),
			{ verified: report },
		]);
	});
});
