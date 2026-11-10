// iPhoneアプリへ同梱するLexicalの文書モデルと、含めた依存のライセンス文書を生成する。
// 依存はリポジトリのルートで固定したものを使い、PCのエディタと同じ版のLexicalを1つだけ含める。
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = import.meta.dir;
const root = fileURLToPath(new URL("../../../", import.meta.url));
const resources = new URL("../App/Resources/", import.meta.url);

const result = await Bun.build({
	entrypoints: [`${directory}/editor.mjs`],
	target: "browser",
	format: "iife",
	minify: true,
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
	metafile: true,
	plugins: [
		{
			name: "dom-free-character-references",
			setup(build) {
				// ブラウザー向けの版はDOMで文字参照を解くため、JavaScriptCoreでは表を使う版にする。
				build.onResolve(
					{ filter: /^decode-named-character-reference$/ },
					({ importer }) => ({
						path: join(
							dirname(
								Bun.resolveSync(
									"decode-named-character-reference/package.json",
									dirname(importer),
								),
							),
							"index.js",
						),
					}),
				);
			},
		},
	],
});
if (!result.success)
	throw new AggregateError(result.logs, "Lexicalモデルのビルドに失敗しました");
await writeFile(
	new URL("LexicalModel.js", resources),
	await result.outputs[0].text(),
);

// 実際に束ねたファイルが属するパッケージのライセンスを同梱する。metafileの入力は実行時の作業ディレクトリ基準。
const packages = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
	let current = dirname(resolve(input));
	while (current.startsWith(root) && current !== root) {
		try {
			const pkg = JSON.parse(
				await readFile(join(current, "package.json"), "utf8"),
			);
			if (pkg.name && pkg.version) {
				packages.set(`${pkg.name}@${pkg.version}`, current);
				break;
			}
		} catch {}
		current = dirname(current);
	}
}
if (packages.size === 0)
	throw new Error("同梱した依存のパッケージを特定できませんでした");
const licenses = [];
for (const [name, location] of [...packages].sort()) {
	if (location === root || !location.includes("node_modules")) continue;
	const file = (await readdir(location)).find((file) =>
		/^licen[cs]e(?:\..+)?$/i.test(file),
	);
	if (!file) throw new Error(`${name}: ライセンス文書が見つかりません`);
	licenses.push(`${name}\n${await readFile(join(location, file), "utf8")}`);
}
await writeFile(
	new URL("LexicalModel-LICENSES.txt", resources),
	licenses.join("\n\n"),
);
