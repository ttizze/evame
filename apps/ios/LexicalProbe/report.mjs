import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { htmlTree } from "../markdown-html.mjs";

const [macDirectory, iosDirectory, output] = process.argv.slice(2);
assert(
	macDirectory && iosDirectory && output,
	"macOS/iOSのレポートディレクトリと出力先を指定する",
);
const commonmark = unified()
	.use(remarkParse)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeStringify, { allowDangerousHtml: true });
const gfm = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeStringify, { allowDangerousHtml: true });
const summaries = [];
for (const mode of ["legacy", "mdast", "pc", "pc-same-writer"]) {
	const mac = JSON.parse(
		readFileSync(join(macDirectory, `${mode}.json`), "utf8"),
	);
	const ios = JSON.parse(
		readFileSync(join(iosDirectory, `${mode}.json`), "utf8"),
	);
	assert.equal(mac.length, 1329);
	assert.deepEqual(ios, mac, `${mode}: macOSとiOSで比較結果が違う`);
	for (const [corpus, count] of [
		["commonmark-0.31.2", 652],
		["gfm-0.29", 677],
	]) {
		const cases = mac.filter((row) => row.corpus === corpus);
		assert.equal(cases.length, count);
		assert.equal(new Set(cases.map((row) => row.example)).size, count);
		const renderer = corpus.startsWith("gfm") ? gfm : commonmark;
		const differences = [];
		let htmlEqual = 0,
			goldenBaselineEqual = 0;
		for (const row of cases) {
			const before = String(renderer.processSync(row.source));
			const goldenEqual = isDeepStrictEqual(
				htmlTree(before),
				htmlTree(row.expectedHtml),
			);
			if (goldenEqual) goldenBaselineEqual++;
			const after = row.error
				? null
				: String(renderer.processSync(row.markdown));
			const equal =
				after !== null && isDeepStrictEqual(htmlTree(before), htmlTree(after));
			if (equal) htmlEqual++;
			if (!row.astEqual || !equal || !goldenEqual)
				differences.push({
					...row,
					renderedHtmlEqual: equal,
					goldenBaselineEqual: goldenEqual,
					beforeHtml: before,
					afterHtml: after,
				});
		}
		summaries.push({
			mode,
			corpus,
			count,
			astEqual: cases.filter((row) => row.astEqual).length,
			renderedHtmlEqual: htmlEqual,
			goldenBaselineEqual,
			differences,
		});
	}
}
writeFileSync(
	output,
	`${JSON.stringify({ lexical: "0.53.0", platformResultsIdentical: true, summaries }, null, 2)}\n`,
);
console.log(
	JSON.stringify(
		summaries.map(({ differences, ...summary }) => summary),
		null,
		2,
	),
);
