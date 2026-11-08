import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

const output = new URL("../.build/vditor-web/", import.meta.url);
const distribution = new URL("node_modules/vditor/dist/", import.meta.url);
await mkdir(output, { recursive: true });
for (const path of [
	"index.min.js",
	"index.css",
	"js/lute/lute.min.js",
	"js/i18n/ja_JP.js",
	"js/icons/ant.js",
	"css/content-theme",
]) {
	const target = new URL(`dist/${path}`, output);
	await mkdir(new URL(".", target), { recursive: true });
	await cp(new URL(path, distribution), target, { recursive: true });
}
await cp(new URL("index.html", import.meta.url), new URL("index.html", output));
await cp(
	new URL("corpus.js", import.meta.url),
	new URL("corpus-runner.js", output),
);
const corpus = [];
for (const name of ["commonmark-0.31.2", "gfm-0.29"]) {
	const cases = JSON.parse(
		await readFile(
			new URL(
				`../Tests/EditorCoreTests/Fixtures/Upstream/${name}.json`,
				import.meta.url,
			),
			"utf8",
		),
	);
	corpus.push(...cases.map((entry) => ({ ...entry, corpus: name })));
}
await writeFile(
	new URL("corpus.js", output),
	`window.corpus = ${JSON.stringify(corpus)};\n`,
);
