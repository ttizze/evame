import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { devDependencies } = JSON.parse(
	await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const version = devDependencies?.vitest;
if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version))
	throw new Error("Vitest must be pinned to an exact version");

export function parseGitDiff(output) {
	if (!output) return [];
	if (!output.endsWith("\0")) throw new Error("Incomplete Git diff");
	const fields = output.slice(0, -1).split("\0");
	const changes = [];
	while (fields.length) {
		const status = fields.shift();
		if (!/^(?:[AMDTU]|[RC]\d{1,3})$/.test(status)) {
			throw new Error(`Unknown Git status: ${status}`);
		}
		const paths = fields.splice(0, /^[RC]/.test(status) ? 2 : 1);
		if (
			paths.length !== (/^[RC]/.test(status) ? 2 : 1) ||
			paths.some((path) => !path)
		) {
			throw new Error("Incomplete Git paths");
		}
		changes.push({ status, paths });
	}
	return changes;
}

export async function selectTests(context, changes) {
	const specifications = await context.globTestSpecifications();
	if (!specifications.length) throw new Error("No test specifications found");
	const full = (reason) => ({ specifications, reason: `full: ${reason}` });
	if (!changes) return full("no base SHA");
	if (!changes.length) return full("empty diff");
	const paths = changes.flatMap((change) => change.paths);
	if (
		changes.some((change) => !/^[AM]$/.test(change.status)) ||
		paths.some(
			(path) =>
				!/\.[cm]?[jt]sx?$/.test(path) ||
				/(^|\/)(?:[^/]*config[^/]*|[^/]*setup[^/]*|_db|\.github|nix|patches)(\/|$)/i.test(
					path,
				) ||
				/^(?:scripts|apps\/ios|src\/(?:db|drizzle|tests))\//.test(path),
		)
	)
		return full("configuration, data, or structural change");
	context.config.related = paths.map((path) =>
		resolve(context.config.root, path),
	);
	let relevant;
	try {
		relevant = await context.getRelevantTestSpecifications();
	} catch (error) {
		return full(`dependency graph failed: ${error.message}`);
	}
	if (!relevant.length) return full("no static reachability");
	if (
		relevant.some(
			(spec) =>
				!specifications.some(
					(candidate) =>
						candidate.project === spec.project &&
						candidate.moduleId === spec.moduleId,
				),
		)
	)
		return full("unknown relevant specification");
	const knownPaths = new Set();
	const opaque = new Map();
	for (const project of context.projects) {
		const graph = project.vite.environments?.ssr?.moduleGraph;
		if (
			!graph ||
			specifications.some(
				(spec) =>
					spec.project === project && !graph.idToModuleMap.has(spec.moduleId),
			)
		)
			return full("incomplete project graph");
		const opaqueIds = new Set();
		const queue = [];
		for (const module of graph.idToModuleMap.values()) {
			if (!module.file || module.file.includes("/node_modules/")) continue;
			const path = relative(context.config.root, module.file);
			if (path.startsWith("..") || isAbsolute(path)) continue;
			if (!module.transformResult) return full(`unknown transform: ${path}`);
			knownPaths.add(module.file);
			const { code, deps = [], dynamicDeps = [] } = module.transformResult;
			if (
				[...deps, ...dynamicDeps].some((dependency) =>
					/^(?:node:)?(?:fs(?:\/promises)?|child_process|module|vm|worker_threads)$/.test(
						dependency,
					),
				) ||
				/\b(?:eval|Function|require)\s*\(|\bBun\s*\.\s*(?:file|Glob|spawn|spawnSync)\b|__vite_ssr_dynamic_import__\(\s*[^"'\s]/.test(
					code,
				)
			) {
				if (context.config.related.includes(module.file))
					return full(`opaque dependency changed: ${path}`);
				queue.push(module);
			}
		}
		while (queue.length) {
			const module = queue.pop();
			if (opaqueIds.has(module.id)) continue;
			opaqueIds.add(module.id);
			for (const importer of module.importers) {
				const parent = graph.idToModuleMap.get(importer.id);
				if (parent) queue.push(parent);
			}
		}
		opaque.set(project, opaqueIds);
	}
	if (context.config.related.some((path) => !knownPaths.has(path)))
		return full("changed file outside graph");
	const selected = new Set(
		relevant.map((spec) => `${spec.project.name}:${spec.moduleId}`),
	);
	return {
		specifications: specifications.filter(
			(spec) =>
				selected.has(`${spec.project.name}:${spec.moduleId}`) ||
				opaque.get(spec.project)?.has(spec.moduleId),
		),
		reason: "related: static graph plus opaque dependency suites",
	};
}

export function distributeTests(files, count, durations) {
	if (!Number.isSafeInteger(count) || count < 1)
		throw new Error("Invalid shard count");
	if (new Set(files).size !== files.length)
		throw new Error("Duplicate test specifications");
	if (
		[...durations.values()].some(
			(duration) =>
				typeof duration !== "number" ||
				!Number.isFinite(duration) ||
				duration < 0,
		)
	) {
		durations = new Map();
	}
	const measured = [...durations.values()].sort((left, right) => left - right);
	const estimate = measured[Math.floor(measured.length / 2)] || 1;
	const shards = Array.from({ length: count }, () => ({
		files: [],
		duration: 0,
	}));
	const sorted = [...files].sort();
	sorted.sort(
		(left, right) =>
			(durations.get(right) ?? estimate) - (durations.get(left) ?? estimate),
	);
	for (const file of sorted) {
		let target = shards[0];
		for (const shard of shards) {
			if (
				shard.duration < target.duration ||
				(shard.duration === target.duration &&
					shard.files.length < target.files.length)
			)
				target = shard;
		}
		target.files.push(file);
		target.duration += durations.get(file) ?? estimate;
	}
	return shards;
}

function parseSnapshot(document) {
	if (document?.version !== version || !Array.isArray(document.results))
		throw new Error("Invalid duration snapshot version or results");
	const durations = new Map();
	for (const entry of document.results) {
		if (
			!Array.isArray(entry) ||
			entry.length !== 2 ||
			typeof entry[0] !== "string" ||
			!entry[0] ||
			durations.has(entry[0])
		)
			throw new Error("Invalid duration entry");
		const duration = entry[1]?.duration;
		if (
			typeof duration !== "number" ||
			!Number.isFinite(duration) ||
			duration < 0
		)
			throw new Error("Invalid recorded duration");
		durations.set(entry[0], duration);
	}
	return durations;
}

export async function readDurationSnapshot(path) {
	let text;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return new Map();
		throw error;
	}
	try {
		return parseSnapshot(JSON.parse(text));
	} catch (error) {
		console.warn(
			`[ci-tests] Ignoring corrupt duration snapshot ${path}: ${error.message}`,
		);
		return new Map();
	}
}

function digest(value) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function writeSnapshot(path, document) {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${process.pid}.tmp`;
	await writeFile(temporary, `${JSON.stringify(document)}\n`);
	await rename(temporary, path);
}

export async function mergeDurations(input, outputs, output) {
	if (!outputs.length) throw new Error("Shard outputs are required");
	if (
		outputs.some(
			(path) =>
				resolve(path) === resolve(output) || resolve(path) === resolve(input),
		)
	)
		throw new Error("Shard outputs must differ from snapshot paths");
	const baseline = await readDurationSnapshot(input);
	const snapshot = digest(
		[...baseline].sort(([left], [right]) =>
			left < right ? -1 : left > right ? 1 : 0,
		),
	);
	const documents = await Promise.all(
		outputs.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
	);
	const first = documents[0].ci;
	if (
		!first ||
		!Number.isSafeInteger(first.count) ||
		first.count < 1 ||
		outputs.length !== first.count
	)
		throw new Error("Missing shard outputs");
	const indices = new Set();
	const files = new Set();
	for (const document of documents) {
		const durations = parseSnapshot(document);
		const ci = document.ci;
		if (
			!ci ||
			ci.snapshot !== snapshot ||
			ci.plan !== first.plan ||
			ci.count !== first.count ||
			!Number.isSafeInteger(ci.index) ||
			ci.index < 1 ||
			ci.index > ci.count ||
			indices.has(ci.index) ||
			!Array.isArray(ci.files)
		)
			throw new Error("Inconsistent shard snapshot or identity");
		indices.add(ci.index);
		for (const file of ci.files) {
			if (typeof file !== "string" || files.has(file))
				throw new Error("Duplicate or invalid shard file");
			files.add(file);
		}
		if ([...durations.keys()].some((file) => !ci.files.includes(file)))
			throw new Error("Duration outside assigned shard");
		if (
			durations.size !== ci.files.length ||
			document.results.some(([, result]) => result.failed !== false)
		)
			throw new Error("Incomplete or failed shard measurements");
		for (const [file, duration] of durations) baseline.set(file, duration);
	}
	if (digest([...files].sort()) !== first.plan)
		throw new Error("Missing selected test files");
	await writeSnapshot(output, {
		version,
		results: [...baseline]
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([file, duration]) => [file, { duration, failed: false }]),
	});
}

export async function run(options, createContext) {
	const { index, count } = options.shard;
	if (
		!Number.isSafeInteger(index) ||
		!Number.isSafeInteger(count) ||
		index < 1 ||
		index > count
	)
		throw new Error("Invalid shard");
	if (resolve(options.input) === resolve(options.output))
		throw new Error("Input snapshot must be immutable");
	const durations = await readDurationSnapshot(options.input);
	const snapshot = digest(
		[...durations].sort(([left], [right]) =>
			left < right ? -1 : left > right ? 1 : 0,
		),
	);
	await rm(options.output, { force: true });
	let changes = null;
	if (options.base) {
		try {
			if (!/^[a-f\d]{40,64}$/i.test(options.base))
				throw new Error("Base must be a full Git SHA");
			changes = parseGitDiff(
				execFileSync(
					"git",
					[
						"diff",
						"--name-status",
						"--find-renames",
						"-z",
						`${options.base}...HEAD`,
						"--",
					],
					{ encoding: "utf8" },
				),
			);
		} catch (error) {
			console.warn(
				`[ci-tests] Full fallback: Git diff unavailable: ${error.message}`,
			);
		}
	}
	process.env.TEST = "true";
	process.env.VITEST = "true";
	process.env.NODE_ENV ??= "test";
	const context = await createContext(
		{ watch: false, run: true, isolate: true },
		{ cacheDir: options.cacheDir },
	);
	try {
		await context.standalone();
		const selection = await selectTests(context, changes);
		const specifications = new Map(
			selection.specifications.map((spec) => [
				`${spec.project.name}:${relative(context.config.root, spec.moduleId).replaceAll("\\", "/")}`,
				spec,
			]),
		);
		if (specifications.size !== selection.specifications.length)
			throw new Error("Duplicate test identities");
		const files = [...specifications.keys()].sort();
		const shards = distributeTests(files, count, durations);
		const assigned = shards[index - 1].files;
		console.log(
			`[ci-tests] ${selection.reason}; shard ${index}/${count}: ${assigned.length}/${files.length} files, estimated ${shards[index - 1].duration}ms; snapshot ${snapshot}`,
		);
		if (assigned.length) {
			const result = await context.runTestSpecifications(
				assigned.map((file) => specifications.get(file)),
				count === 1 && selection.reason.startsWith("full:"),
			);
			if (
				result.unhandledErrors.length ||
				result.testModules.some(
					(module) => !["passed", "skipped"].includes(module.state()),
				) ||
				context.state.getUnhandledErrors().length ||
				process.exitCode
			)
				throw new Error("Vitest failed");
			if (result.testModules.length !== assigned.length)
				throw new Error("Vitest did not complete every assigned file");
		}
		const results = [];
		for (const file of assigned) {
			const result = context.cache.getFileTestResults(file);
			if (
				!result ||
				typeof result.duration !== "number" ||
				!Number.isFinite(result.duration) ||
				result.duration < 0 ||
				result.failed
			)
				throw new Error(`Missing or invalid measurement: ${file}`);
			results.push([file, result]);
		}
		await writeSnapshot(options.output, {
			version,
			results,
			ci: { index, count, snapshot, plan: digest(files), files: assigned },
		});
	} finally {
		await context.close();
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	try {
		const { values, positionals } = parseArgs({
			options: {
				shard: { type: "string", default: "1/1" },
				output: { type: "string" },
			},
			allowPositionals: true,
		});
		const input =
			process.env.CI_TEST_DURATIONS_INPUT || ".data/ci-test-durations.json";
		if (positionals[0] === "merge") {
			await mergeDurations(input, positionals.slice(1), values.output || input);
		} else {
			if (
				positionals.length ||
				values.output ||
				!/^\d+\/\d+$/.test(values.shard)
			)
				throw new Error(
					"Usage: bun scripts/ci-tests.mjs --shard 1/4 | merge --output <snapshot> <shard outputs...>",
				);
			const [index, count] = values.shard.split("/").map(Number);
			if (process.versions.bun) {
				const result = spawnSync("node", process.argv.slice(1), {
					stdio: "inherit",
				});
				if (result.error) throw result.error;
				if (result.signal)
					throw new Error(`Node runner terminated by ${result.signal}`);
				process.exit(result.status ?? 1);
			}
			const { createVitest, version: installedVersion } = await import(
				"vitest/node"
			);
			if (installedVersion !== version)
				throw new Error(
					`Expected Vitest ${version}, received ${installedVersion}`,
				);
			await run(
				{
					shard: { index, count },
					base: process.env.CI_TEST_BASE || null,
					input,
					output:
						process.env.CI_TEST_DURATIONS_OUTPUT ||
						`.data/ci-test-durations-${index}-of-${count}.json`,
					cacheDir:
						process.env.CI_TEST_CACHE_DIR ||
						`.data/ci-test-cache/${index}-of-${count}`,
				},
				createVitest,
			);
		}
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
