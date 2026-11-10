import { readFile } from "node:fs/promises";

/**
 * Xcodeが列挙したテストを、入力順に依存せず重複のない組へ分ける。
 * @param {string[]} identifiers
 * @param {number} index
 * @param {number} count
 */
export function selectIosTests(identifiers, index, count) {
	if (
		!Number.isInteger(index) ||
		!Number.isInteger(count) ||
		count < 1 ||
		count > identifiers.length ||
		index < 0 ||
		index >= count
	)
		throw new RangeError(`Invalid test shard: ${index}/${count}`);
	return identifiers
		.toSorted()
		.filter((_, position) => position % count === index);
}

if (import.meta.main) {
	const [path, index, count] = process.argv.slice(2);
	const { errors, values } = JSON.parse(await readFile(path, "utf8"));
	if (errors.length > 0) throw new Error(JSON.stringify(errors));
	const identifiers = values.flatMap(({ enabledTests }) =>
		enabledTests.map(({ identifier }) => identifier),
	);
	const selected = selectIosTests(identifiers, Number(index), Number(count));
	console.error(
		`UI shard ${Number(index) + 1}/${count}: ${selected.length}/${identifiers.length} tests`,
	);
	console.log(selected.join("\n"));
}
