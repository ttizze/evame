import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { readServerFunctions } from "./server-functions.mjs";

it("遅延読み込みでチャンク名が変わってもServer Functionの名前とIDを取得する", async () => {
	const directory = await mkdtemp(join(tmpdir(), "evame-functions-"));
	try {
		const id = "a".repeat(64);
		await writeFile(
			join(directory, "server-random.js"),
			`const manifest = {"${id}": {functionName: "saveArticle", importer: () => import("./action.js")}};`,
		);
		await writeFile(
			join(directory, "other.js"),
			"export const ignored = true;",
		);
		expect(await readServerFunctions(directory)).toEqual({ saveArticle: id });
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

it("最小化でテンプレート文字列になったServer Functionの名前とIDを取得する", async () => {
	const directory = await mkdtemp(join(tmpdir(), "evame-functions-"));
	try {
		const id = "b".repeat(64);
		await writeFile(
			join(directory, "server-minified.js"),
			`var manifest={${id}:{functionName:\`saveArticle\`,importer:()=>import(\`./action.js\`)}};`,
		);
		expect(await readServerFunctions(directory)).toEqual({ saveArticle: id });
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
