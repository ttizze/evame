import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET = 'await(0,b.trackDynamicImport)(import("node:sqlite"))';
const REPLACEMENT =
	'await(0,b.trackDynamicImport)(Promise.reject(Object.assign(new Error("node:sqlite unavailable"),{code:"ERR_UNKNOWN_BUILTIN_MODULE"})))';

export function patchNodeSqliteImport(source: string) {
	return source.includes(TARGET)
		? source.replaceAll(TARGET, REPLACEMENT)
		: source;
}

if (import.meta.main) {
	const handlerPath = resolve(
		".open-next/server-functions/default/handler.mjs",
	);
	const source = readFileSync(handlerPath, "utf8");

	if (source.includes(REPLACEMENT)) {
		console.log("OpenNext handler already patched for node:sqlite");
		process.exit(0);
	}

	const patched = patchNodeSqliteImport(source);

	if (patched === source) {
		throw new Error("node:sqlite import not found in OpenNext handler");
	}

	writeFileSync(handlerPath, patched);
	console.log("Patched OpenNext handler to avoid node:sqlite on Cloudflare");
}
