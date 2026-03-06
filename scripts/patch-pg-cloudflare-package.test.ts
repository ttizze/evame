import { describe, expect, it } from "vitest";
import { patchPgCloudflarePackageJson } from "./patch-pg-cloudflare-package";

describe("patchPgCloudflarePackageJson", () => {
	it("default export を dist/index.js に置き換える", () => {
		const source = JSON.stringify(
			{
				name: "pg-cloudflare",
				exports: {
					".": {
						workerd: {
							import: "./esm/index.mjs",
							require: "./dist/index.js",
						},
						default: "./dist/empty.js",
					},
				},
			},
			null,
			2,
		);

		const patched = patchPgCloudflarePackageJson(source);

		expect(JSON.parse(patched)).toMatchObject({
			exports: {
				".": {
					default: "./dist/index.js",
				},
			},
		});
	});

	it("すでに patch 済みなら元の文字列を返す", () => {
		const source = `${JSON.stringify(
			{
				name: "pg-cloudflare",
				exports: {
					".": {
						default: "./dist/index.js",
					},
				},
			},
			null,
			2,
		)}\n`;

		expect(patchPgCloudflarePackageJson(source)).toBe(source);
	});
});
