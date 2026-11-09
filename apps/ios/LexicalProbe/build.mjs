import {
	copyFile,
	mkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = import.meta.dir;
const generated = new URL("./Swift/Generated/", import.meta.url);
const web = JSON.parse(
	await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
);
const probe = JSON.parse(
	await readFile(new URL("./package.json", import.meta.url), "utf8"),
);
for (const [name, version] of Object.entries(web.dependencies)) {
	if (
		(name === "lexical" || name.startsWith("@lexical/")) &&
		version !== probe.devDependencies.lexical
	)
		throw new Error(`WebとProbeのLexical固定版が異なります: ${name}`);
}
await mkdir(generated, { recursive: true });
const resolutions = new Map();
resolutions.set(
	"decode-named-character-reference",
	Bun.resolveSync("decode-named-character-reference", directory),
);
for (const name of [
	"lexical",
	...(await readdir(`${directory}/node_modules/@lexical`)).map(
		(name) => `@lexical/${name}`,
	),
]) {
	const pkg = JSON.parse(
		await readFile(`${directory}/node_modules/${name}/package.json`, "utf8"),
	);
	if (pkg.version !== probe.devDependencies.lexical)
		throw new Error(`Probe内のLexical固定版が異なります: ${name}`);
	for (const key of Object.keys(pkg.exports ?? { ".": pkg.main })) {
		if (!key.startsWith(".") || key.includes("*")) continue;
		const specifier = name + (key === "." ? "" : key.slice(1));
		resolutions.set(specifier, Bun.resolveSync(specifier, directory));
	}
}
for (const mode of ["legacy", "mdast", "pc"]) {
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
						({ path }) => {
							const resolved = resolutions.get(path);
							if (!resolved)
								throw new Error(`unresolved Lexical entry ${path}`);
							return { path: resolved };
						},
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
