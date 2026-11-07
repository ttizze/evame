import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = import.meta.dir;
const resources = new URL("../Sources/EditorCore/Resources/", import.meta.url);
const fixtures = new URL(
	"../Tests/EditorCoreTests/Fixtures/Upstream/",
	import.meta.url,
);
await mkdir(resources, { recursive: true });
for (const test of [false, true]) {
	const entry = test
		? fileURLToPath(new URL("prosemirror-commands.test.ts.txt", fixtures))
		: `${directory}/model.mjs`;
	const result = await Bun.build({
		entrypoints: [entry],
		target: "browser",
		format: "iife",
		minify: !test,
		plugins: [
			{
				name: "native-editor-tests",
				setup(build) {
					build.onResolve(
						{ filter: /^(prosemirror-[\w-]+|ist)$/ },
						({ path }) => ({ path: Bun.resolveSync(path, directory) }),
					);
					build.onLoad(
						{ filter: /prosemirror-commands\.test\.ts\.txt$/ },
						async ({ path }) => ({
							loader: "ts",
							contents: `
const evameResults = [];
const evameSuites = [];
function describe(name, run) { evameSuites.push(name); try { run(); } finally { evameSuites.pop(); } }
function it(name, run) {
  const result = { command: evameSuites.join(" / "), name, error: null };
  try { run(); } catch (error) { result.error = String(error); }
  evameResults.push(result);
}
${await readFile(path, "utf8")}
globalThis.evameReferenceResults = JSON.stringify(evameResults);
`,
						}),
					);
				},
			},
		],
	});
	if (!result.success)
		throw new AggregateError(result.logs, "編集モデルのビルドに失敗しました");
	await writeFile(
		new URL(
			test ? "ProseMirrorTests.js" : "EditorModel.js",
			test ? fixtures : resources,
		),
		await result.outputs[0].text(),
	);
}
const packages = new Set([
	"prosemirror-commands",
	"prosemirror-model",
	"prosemirror-state",
	"prosemirror-schema-basic",
	"prosemirror-schema-list",
]);
const licenses = [];
for (const name of packages) {
	const root = `${directory}/node_modules/${name}`;
	const pkg = JSON.parse(await readFile(`${root}/package.json`, "utf8"));
	for (const dependency of Object.keys(pkg.dependencies ?? {}))
		packages.add(dependency);
	licenses.push(
		`${name} ${pkg.version}\n${await readFile(`${root}/LICENSE`, "utf8")}`,
	);
}
await writeFile(
	new URL("ProseMirror-LICENSES.txt", resources),
	licenses.join("\n\n"),
);
