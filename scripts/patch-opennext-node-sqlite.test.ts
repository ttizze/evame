import { describe, expect, it } from "vitest";
import { patchNodeSqliteImport } from "./patch-opennext-node-sqlite";

describe("patchNodeSqliteImport", () => {
	it("node:sqlite の dynamic import を Cloudflare で失敗扱いへ置換する", () => {
		const source =
			'let c3;try{({DatabaseSync:c3}=await(0,b.trackDynamicImport)(import("node:sqlite")))}catch(a2){if(a2!==null&&typeof a2=="object"&&"code"in a2&&a2.code!=="ERR_UNKNOWN_BUILTIN_MODULE")throw a2}';

		const patched = patchNodeSqliteImport(source);

		expect(patched).not.toContain('import("node:sqlite")');
		expect(patched).toContain(
			'Promise.reject(Object.assign(new Error("node:sqlite unavailable"),{code:"ERR_UNKNOWN_BUILTIN_MODULE"}))',
		);
	});
});
