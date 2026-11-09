import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const [chromiumPath, webkitPath, wkPath, output] = process.argv.slice(2);
assert(
	chromiumPath && webkitPath && wkPath && output,
	"Chromium/WebKit/WKWebViewのJSONと出力先を指定する",
);
const [chromium, webkit, wk] = await Promise.all(
	[chromiumPath, webkitPath, wkPath].map(async (path) =>
		JSON.parse(await readFile(path, "utf8")),
	),
);
assert.equal(chromium.vditor, "4.0.1");
assert.equal(webkit.vditor, "4.0.1");
assert.equal(chromium.browser, "chromium");
assert.equal(webkit.browser, "webkit-iphone");
const browserCases = chromium.summaries.flatMap((summary) => summary.cases);
const mobileCases = webkit.summaries.flatMap((summary) => summary.cases);
assert.equal(browserCases.length, 1329);
assert.equal(mobileCases.length, 1329);
assert.equal(wk.length, 1329);
const values = (rows) =>
	rows.map(({ corpus, example, markdown, saved, error }) => ({
		corpus,
		example,
		markdown,
		saved,
		error,
	}));
assert.deepEqual(
	values(mobileCases),
	values(browserCases),
	"ChromiumとWebKitで保存結果が違う",
);
assert.deepEqual(
	values(wk),
	values(browserCases),
	"WKWebViewとブラウザーで保存結果が違う",
);
const summaries = chromium.summaries.map(({ cases, ...summary }) => ({
	...summary,
	differences: cases.filter((row) => !row.preserved),
}));
await writeFile(
	output,
	JSON.stringify(
		{ vditor: "4.0.1", platformResultsIdentical: true, summaries },
		null,
		2,
	),
);
console.log(
	JSON.stringify(
		summaries.map(({ differences, ...summary }) => summary),
		null,
		2,
	),
);
