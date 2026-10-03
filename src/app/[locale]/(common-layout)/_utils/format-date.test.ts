// @vitest-environment node
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("日付表示のタイムゾーン", () => {
	it.each(["UTC", "Asia/Tokyo", "America/Los_Angeles"])(
		"実行環境が%sでもUTCの日付を各言語で表示する",
		(timeZone) => {
			const output = execFileSync(
				process.execPath,
				[
					"--input-type=module",
					"--eval",
					`import { formatDate } from ${JSON.stringify(new URL("./format-date.ts", import.meta.url).href)};
console.log(JSON.stringify([
 formatDate(new Date("2024-11-14T23:30:00Z"), "ja"),
 formatDate(new Date("2024-11-15T00:30:00Z"), "en-US"),
 formatDate(new Date("2024-12-31T23:30:00Z"), "ja"),
 formatDate(new Date("2025-01-01T00:30:00Z"), "en-US"),
]));`,
				],
				{
					env: { TZ: timeZone },
					encoding: "utf8",
				},
			);
			expect(JSON.parse(output)).toEqual([
				"2024/11/14",
				"11/15/2024",
				"2024/12/31",
				"1/1/2025",
			]);
		},
	);
});
