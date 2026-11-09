import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const directory = new URL(
	"../apps/ios/Tests/EditorCoreTests/Fixtures/Upstream/",
	import.meta.url,
);
await mkdir(directory, { recursive: true });
const sources = [
	[
		"commonmark-0.31.2.json",
		"https://spec.commonmark.org/0.31.2/spec.json",
		"d431b29d97b6f73e69d547109cf5081578fac931e72afe95639ebe766c1b2a20",
	],
	[
		"gfm-0.29.html",
		"https://github.github.com/gfm/",
		"b153d814fdfc8624bb6da7449162c1cd707a637f7d1c1b636eb44b9cf63fa220",
	],
	[
		"prosemirror-commands.test.ts.txt",
		"https://raw.githubusercontent.com/ProseMirror/prosemirror-commands/52a84a842774fadec3b167bcdbd56085ec6c85df/test/test-commands.ts",
		"fd0fbaaefad8846ffc39864f7c4c82d9fd9580220dc28f0bfe69f8a66172119f",
	],
	[
		"ProseMirror-LICENSE.txt",
		"https://raw.githubusercontent.com/ProseMirror/prosemirror-commands/52a84a842774fadec3b167bcdbd56085ec6c85df/LICENSE",
		"ef0b452ced6304db2ce78ca66de1fc7b97bab05bc1750c95df359ed3fe1d65c8",
	],
];
const manifest = [];
for (const [name, url, expectedHash] of sources) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
	const source = await response.text();
	const sourceHash = createHash("sha256").update(source).digest("hex");
	if (sourceHash !== expectedHash)
		throw new Error(`${name}: 出典の内容が変化しました`);
	if (name === "gfm-0.29.html") {
		const decode = (text) =>
			text
				.replace(/<span class="space"> <\/span>/g, " ")
				.replace(/→/g, "\t")
				.replace(
					/&(amp|lt|gt|quot|#39);/g,
					(_, entity) =>
						({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[entity],
				);
		const cases = [
			...source.matchAll(
				/<div class="example" id="example-(\d+)">[\s\S]*?<code class="language-markdown">([\s\S]*?)<\/code>[\s\S]*?<code class="language-html">([\s\S]*?)<\/code>/g,
			),
		].map((match) => ({
			example: Number(match[1]),
			markdown: decode(match[2]),
			html: decode(match[3]),
		}));
		if (cases.length !== 677)
			throw new Error(`GFMケース数が変化しました: ${cases.length}`);
		const output = `${JSON.stringify(cases, null, 2)}\n`;
		await writeFile(new URL("gfm-0.29.json", directory), output);
		manifest.push({
			name: "gfm-0.29.json",
			url,
			sourceSha256: sourceHash,
			sha256: createHash("sha256").update(output).digest("hex"),
		});
		continue;
	}
	await writeFile(new URL(name, directory), source);
	manifest.push({ name, url, sha256: sourceHash });
	if (name === "prosemirror-commands.test.ts.txt") {
		let command = "";
		const cases = [];
		source.split("\n").forEach((line, offset) => {
			const suite = /^describe\(["'](.+?)["']/.exec(line);
			if (suite) command = suite[1];
			const test = /^\s+it\(["'](.+?)["'],/.exec(line);
			if (test) cases.push({ command, name: test[1], line: offset + 1 });
		});
		if (cases.length !== 133)
			throw new Error(`操作ケース数が変化しました: ${cases.length}`);
		await writeFile(
			new URL("prosemirror-cases.json", directory),
			`${JSON.stringify(cases, null, 2)}\n`,
		);
	}
}
await writeFile(
	new URL("manifest.json", directory),
	`${JSON.stringify(manifest, null, 2)}\n`,
);
