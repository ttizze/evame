import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";

const number = process.env.PR_NUMBER;
if (!number || !/^[1-9]\d*$/.test(number))
	throw new Error("PR_NUMBER is required");
let secrets;
try {
	secrets = JSON.parse(process.env.EVAME_PREVIEW_SECRETS ?? "null");
} catch {
	throw new Error("Invalid preview secrets");
}
for (const key of [
	"TURSO_DATABASE_URL",
	"TURSO_AUTH_TOKEN",
	"BETTER_AUTH_SECRET",
	"ENCRYPTION_KEY",
	"AUTH_RESEND_KEY",
	"PREVIEW_READER_SECRET",
])
	if (typeof secrets?.[key] !== "string" || !secrets[key])
		throw new Error(`Preview secret is required: ${key}`);
if (
	!/^libsql:\/\/evame-preview-[a-z0-9.-]+\.turso\.io$/.test(
		secrets.TURSO_DATABASE_URL,
	)
)
	throw new Error("A dedicated evame-preview database is required");

const previewName = `pr-${number}`;
const gatewayOrigin = `https://${previewName}-evame-start.reimei.workers.dev`;
const appOrigin = `https://app-${previewName}-evame-start.reimei.workers.dev`;
const readerOrigin = `https://reader-${previewName}-evame-start.reimei.workers.dev`;
const directory = `.data/native-preview-${previewName}`;
await mkdir(directory, { recursive: true, mode: 0o700 });
const publication = process.env.EVAME_READER_PUBLICATION === "true";
const publicationVars = publication
	? { READER_PUBLICATION_PREFIX: `reader-connected/${previewName}` }
	: {};
let readerConfig = "reader/dist/server/wrangler.json";
if (publication) {
	const reader = JSON.parse(await readFile(readerConfig, "utf8"));
	const app = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
	const uploads = app.r2_buckets.find(
		(binding) => binding.binding === "UPLOADS",
	);
	if (!uploads) throw new Error("Preview R2 binding is required");
	readerConfig = "reader/dist/server/publication-preview.json";
	await writeFile(
		readerConfig,
		JSON.stringify({
			...reader,
			previews: {
				...reader.previews,
				r2_buckets: [{ binding: "HTML", bucket_name: uploads.bucket_name }],
			},
		}),
	);
}
// URLは公開設定として渡し、古い固定URLの秘密値を引き継がない。
delete secrets.BETTER_AUTH_URL;
await writeFile(`${directory}/app-secrets.json`, JSON.stringify(secrets), {
	mode: 0o600,
});
for (const kind of ["reader", "gateway"])
	await writeFile(
		`${directory}/${kind}-secrets.json`,
		JSON.stringify({ PREVIEW_READER_SECRET: secrets.PREVIEW_READER_SECRET }),
		{ mode: 0o600 },
	);

for (const command of ["db:prod:migrate", "db:prod:seed"])
	execFileSync("bun", ["run", command], {
		stdio: "inherit",
		env: {
			...process.env,
			TURSO_DATABASE_URL: secrets.TURSO_DATABASE_URL,
			TURSO_AUTH_TOKEN: secrets.TURSO_AUTH_TOKEN,
		},
	});

// 非公開の本番Readerは公開せず、3つのPreviewを公開URLのある親Workerに作る。
for (const [kind, path, vars] of [
	[
		"reader",
		readerConfig,
		{ PREVIEW_GATEWAY_ORIGIN: gatewayOrigin, ...publicationVars },
	],
	[
		"app",
		"dist/server/wrangler.json",
		{
			...publicationVars,
			PREVIEW_READER_ORIGIN: readerOrigin,
			PREVIEW_GATEWAY_ORIGIN: gatewayOrigin,
			BETTER_AUTH_URL: gatewayOrigin,
			QSTASH_PUBLISH_BASE_URL: gatewayOrigin,
		},
	],
	[
		"gateway",
		"gateway/dist/wrangler.json",
		{ PREVIEW_READER_ORIGIN: readerOrigin, PREVIEW_APP_ORIGIN: appOrigin },
	],
]) {
	execFileSync(
		"bun",
		[
			"x",
			"wrangler",
			"preview",
			"--config",
			path,
			"--name",
			kind === "gateway" ? previewName : `${kind}-${previewName}`,
			"--worker-name",
			"evame-start",
			"--ignore-base-config",
			"--secrets-file",
			`${directory}/${kind}-secrets.json`,
			...Object.entries(vars).flatMap(([key, value]) => [
				"--var",
				`${key}:${value}`,
			]),
		],
		{ stdio: "inherit" },
	);
}
if (publication) {
	const started = Date.now();
	for (;;) {
		const response = await fetch(
			new URL("/__publication-cleanup", readerOrigin),
			{
				method: "POST",
				headers: { "x-evame-preview-reader": secrets.PREVIEW_READER_SECRET },
				signal: AbortSignal.timeout(30000),
			},
		);
		await response.body?.cancel();
		if (response.status === 204) break;
		if (response.status !== 404 || Date.now() - started > 30000)
			throw new Error(`Preview HTML cleanup failed: HTTP ${response.status}`);
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
}
if (process.env.GITHUB_OUTPUT)
	await appendFile(
		process.env.GITHUB_OUTPUT,
		`url=${gatewayOrigin}\nreader_url=${readerOrigin}\n`,
	);
console.log(`Preview: ${gatewayOrigin}/ja/auth/login`);
