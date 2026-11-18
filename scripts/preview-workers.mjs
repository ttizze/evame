import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { confirmDeployment, previewOrigin } from "./cloudflare-build.mjs";
import { prepareReaderConnected } from "./prepare-reader-connected.mjs";
import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

const number = process.env.PR_NUMBER;
if (!number || !/^[1-9]\d*$/.test(number))
	throw new Error("PR_NUMBER is required");
const mode = process.argv[2] ?? "both";
if (!["both", "migrate", "deploy"].includes(mode))
	throw new Error("Unknown Preview operation");
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
])
	if (typeof secrets?.[key] !== "string" || !secrets[key])
		throw new Error(`Preview secret is required: ${key}`);
if (
	!/^libsql:\/\/evame-preview-[a-z0-9.-]+\.turso\.io$/.test(
		secrets.TURSO_DATABASE_URL,
	)
)
	throw new Error("A dedicated evame-preview database is required");

if (mode !== "deploy")
	execFileSync("bun", ["run", "db:prod:migrate"], {
		stdio: "inherit",
		env: {
			...process.env,
			TURSO_DATABASE_URL: secrets.TURSO_DATABASE_URL,
			TURSO_AUTH_TOKEN: secrets.TURSO_AUTH_TOKEN,
		},
	});
if (mode === "migrate") process.exit(0);

const previewName = `pr-${number}`;
const origin = previewOrigin(number);
const directory = `.data/native-preview-${previewName}`;
await mkdir(directory, { recursive: true, mode: 0o700 });
// URLは公開設定として渡し、古い固定URLの秘密値を引き継がない。
delete secrets.BETTER_AUTH_URL;
delete secrets.PREVIEW_READER_SECRET;
delete secrets.CF_IMAGE_HOST;
await writeFile(`${directory}/app-secrets.json`, JSON.stringify(secrets), {
	mode: 0o600,
});

await prepareReaderStorage("dist/server/wrangler.json", true);
const configPath = await prepareReaderConnected("dist/server");
if (process.env.EVAME_WORKERS_PUBLICATION)
	await confirmDeployment(JSON.parse(process.env.EVAME_WORKERS_PUBLICATION));

execFileSync(
	"bun",
	[
		"x",
		"wrangler",
		"preview",
		"--config",
		configPath,
		"--name",
		previewName,
		"--worker-name",
		"evame-start",
		"--ignore-base-config",
		"--secrets-file",
		`${directory}/app-secrets.json`,
		"--var",
		`BETTER_AUTH_URL:${origin}`,
		"--var",
		`QSTASH_PUBLISH_BASE_URL:${origin}`,
	],
	{ stdio: "inherit" },
);
console.log(`Preview: ${origin}/ja/auth/login`);
