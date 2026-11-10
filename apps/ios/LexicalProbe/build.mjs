import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const directory = import.meta.dir;
const generated = new URL("./Swift/Generated/", import.meta.url);
const web = JSON.parse(
	await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
);
const probe = JSON.parse(
	await readFile(new URL("./package.json", import.meta.url), "utf8"),
);
for (const [name, version] of [
	...Object.entries(web.dependencies),
	...Object.entries(probe.devDependencies),
]) {
	if (
		(name === "lexical" || name.startsWith("@lexical/")) &&
		version !== probe.devDependencies.lexical
	)
		throw new Error(`WebとProbeのLexical固定版が異なります: ${name}`);
}
await mkdir(generated, { recursive: true });
for (const mode of ["legacy", "mdast", "pc"]) {
	const resolutionDirectory =
		mode === "pc"
			? fileURLToPath(new URL("../../../", import.meta.url))
			: directory;
	const sdkDirectory = dirname(
		Bun.resolveSync("@lexical/rich-text", resolutionDirectory),
	);
	const result = await Bun.build({
		entrypoints: [`${directory}/${mode}.mjs`],
		target: "browser",
		format: "iife",
		conditions: ["development"],
		define: { "process.env.NODE_ENV": JSON.stringify("development") },
		plugins: [
			{
				name: "one-lexical-instance",
				setup(build) {
					build.onResolve(
						{
							filter:
								/^(lexical$|@lexical\/|decode-named-character-reference$)/,
						},
						({ path }) => ({
							path: Bun.resolveSync(
								path,
								path === "decode-named-character-reference"
									? directory
									: sdkDirectory,
							),
						}),
					);
				},
			},
		],
	});
	if (!result.success) throw new AggregateError(result.logs, `Lexical ${mode}`);
	await writeFile(
		new URL(`${mode}.js`, generated),
		await result.outputs[0].text(),
	);
}
for (const corpus of ["commonmark-0.31.2.json", "gfm-0.29.json"]) {
	await copyFile(
		fileURLToPath(
			new URL(
				`../Tests/EditorCoreTests/Fixtures/Upstream/${corpus}`,
				import.meta.url,
			),
		),
		new URL(corpus, generated),
	);
}
