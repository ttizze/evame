import fs from "node:fs";
import path from "node:path";

export const SYSTEM_USER_HANDLE = "evame" as const;
export const ROOT_SLUG = "tipitaka" as const;
export const ROOT_TITLE = "Tipiṭaka" as const;

const TIPITAKA_DIR_PREFIX = "tipitaka-md";

export const BASE_DIR = (() => {
	const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });
	const match = entries.find(
		(entry) =>
			entry.isDirectory() && entry.name.startsWith(TIPITAKA_DIR_PREFIX),
	);
	return path.resolve(match?.name ?? TIPITAKA_DIR_PREFIX);
})();

const CONVERT_PREFIX = "convert-romn-to-md";

export const BOOKS_JSON_PATH = (() => {
	const scriptsDir = path.resolve("scripts");
	const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (!entry.name.startsWith(CONVERT_PREFIX)) continue;
		const candidate = path.join(scriptsDir, entry.name, "data", "books.json");
		try {
			fs.accessSync(candidate);
			return candidate;
		} catch {}
	}
	return path.join(scriptsDir, CONVERT_PREFIX, "data", "books.json");
})();
