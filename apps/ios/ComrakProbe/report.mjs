import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import htmlToDOM from "html-dom-parser";

// 属性順・void要素の / の違いだけを除く。文字の空白、改行、コメントは残す。
function htmlTree(html) {
	function nodes(entries) {
		return entries.map((node) => {
			if (node.type === "text" || node.type === "comment") {
				return [node.type, node.data];
			}
			return [
				node.type,
				node.name,
				Object.entries(node.attribs ?? {}).sort(([a], [b]) =>
					a.localeCompare(b),
				),
				nodes(node.children ?? []),
			];
		});
	}
	return nodes(htmlToDOM(html));
}

const entries = JSON.parse(readFileSync(process.argv[2], "utf8"));
const summaries = [];
for (const [name, count] of [
	["commonmark-0.31.2", 652],
	["gfm-0.29", 677],
]) {
	const cases = entries.filter((entry) => entry.corpus === name);
	assert.equal(cases.length, count);
	assert.equal(new Set(cases.map((entry) => entry.example)).size, count);
	const different = (predicate) =>
		cases.filter(predicate).map((entry) => entry.example);
	summaries.push({
		corpus: name,
		count,
		parseHtmlExactDifferences: different(
			(entry) => entry.html !== entry.expectedHtml,
		),
		parseHtmlTreeDifferences: different(
			(entry) =>
				!isDeepStrictEqual(htmlTree(entry.html), htmlTree(entry.expectedHtml)),
		),
		roundtripHtmlExactDifferences: different(
			(entry) => entry.html !== entry.roundtripHtml,
		),
		roundtripHtmlTreeDifferences: different(
			(entry) =>
				!isDeepStrictEqual(htmlTree(entry.html), htmlTree(entry.roundtripHtml)),
		),
		roundtripAstDifferences: different((entry) => !entry.treeEqual),
	});
}
const report = {
	comrak: "0.59.0",
	fullyEquivalent: summaries.every(
		(summary) =>
			summary.parseHtmlTreeDifferences.length === 0 &&
			summary.roundtripAstDifferences.length === 0,
	),
	summaries,
	// 差分のある全ケースを出力し、問題を少数のサンプルへ隠さない。
	differences: entries.filter(
		(entry) =>
			entry.html !== entry.expectedHtml ||
			entry.html !== entry.roundtripHtml ||
			!entry.treeEqual,
	),
};
writeFileSync(process.argv[3], `${JSON.stringify(report, null, 2)}\n`);
console.log(
	JSON.stringify(
		{ fullyEquivalent: report.fullyEquivalent, summaries },
		null,
		2,
	),
);
process.exitCode = report.fullyEquivalent ? 0 : 2;
