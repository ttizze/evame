import { execFileSync } from "node:child_process";
import { appendFile, mkdir, writeFile } from "node:fs/promises";

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
const readerOrigin = `https://reader-${previewName}-evame-start.reimei.workers.dev`;
const directory = `.data/native-preview-${previewName}`;
await mkdir(directory, { recursive: true, mode: 0o700 });
// URLは公開設定として渡し、古い固定URLの秘密値を引き継がない。
delete secrets.BETTER_AUTH_URL;
await writeFile(`${directory}/gateway-secrets.json`, JSON.stringify(secrets), {
	mode: 0o600,
});
await writeFile(
	`${directory}/reader-secrets.json`,
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

// 非公開の本番Readerは公開せず、2つのPreviewを公開URLのある親Workerに作る。
for (const [kind, path, vars] of [
	[
		"reader",
		"reader/dist/server/wrangler.json",
		{ PREVIEW_GATEWAY_ORIGIN: gatewayOrigin },
	],
	[
		"gateway",
		"dist/server/wrangler.json",
		{
			PREVIEW_READER_ORIGIN: readerOrigin,
			BETTER_AUTH_URL: gatewayOrigin,
			QSTASH_PUBLISH_BASE_URL: gatewayOrigin,
		},
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
			kind === "reader" ? `reader-${previewName}` : previewName,
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
if (process.env.GITHUB_OUTPUT)
	await appendFile(process.env.GITHUB_OUTPUT, `url=${gatewayOrigin}\n`);
console.log(`Preview: ${gatewayOrigin}/ja/auth/login`);
