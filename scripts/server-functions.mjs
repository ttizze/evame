import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function readServerFunctions(directory) {
	const sources = await Promise.all(
		(await readdir(directory))
			.filter((name) => name.endsWith(".js"))
			.map((name) => readFile(join(directory, name), "utf8")),
	);
	return Object.fromEntries(
		sources.flatMap((source) =>
			[
				...source.matchAll(
					/"?([a-f0-9]{64})"?:\s*\{\s*functionName:\s*["`]([\w$]+)["`]/g,
				),
			].map((match) => [match[2], match[1]]),
		),
	);
}
