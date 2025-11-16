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

export const BOOKS_JSON_PATH = path.resolve(
	"scripts/convert-romn-to-md/data/books.json",
);
