import { expect, it } from "vitest";
import config from "./vitest.config";

it("DOMを使わないテストではブラウザー環境を起動しない", () => {
	expect(typeof document).toBe("undefined");
	expect(config.test?.environment).toBe("node");
	expect(config.test?.isolate).not.toBe(false);
});

it("DOM操作テストだけをjsdomへ割り当て、Node側と重複させない", () => {
	const projects = config.test?.projects as {
		extends: boolean;
		test: {
			name: string;
			environment: string;
			include: string[];
			exclude: string[];
		};
	}[];
	expect(projects).toHaveLength(2);
	const node = projects.find((project) => project.test.name === "node");
	const dom = projects.find((project) => project.test.name === "dom");
	expect(node?.extends).toBe(true);
	expect(dom?.extends).toBe(true);
	expect(dom?.test.environment).toBe("jsdom");
	expect(dom?.test.include).toEqual([
		"**/*.{test,spec}.?(c|m)[jt]sx",
		"**/block-editing.test.ts",
		"**/auth-client.test.ts",
	]);
	for (const pattern of dom?.test.include ?? [])
		expect(node?.test.exclude).toContain(pattern);
});
