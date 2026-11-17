import { execFileSync } from "node:child_process";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { prepareReaderConnected } from "./prepare-reader-connected.mjs";
import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

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
const origin = `https://${previewName}-evame-start.reimei.workers.dev`;
const directory = `.data/native-preview-${previewName}`;
await mkdir(directory, { recursive: true, mode: 0o700 });
// URLは公開設定として渡し、古い固定URLの秘密値を引き継がない。
delete secrets.BETTER_AUTH_URL;
delete secrets.PREVIEW_READER_SECRET;
await writeFile(`${directory}/app-secrets.json`, JSON.stringify(secrets), {
	mode: 0o600,
});

for (const command of ["db:prod:migrate", "db:prod:seed"])
	execFileSync("bun", ["run", command], {
		stdio: "inherit",
		env: {
			...process.env,
			TURSO_DATABASE_URL: secrets.TURSO_DATABASE_URL,
			TURSO_AUTH_TOKEN: secrets.TURSO_AUTH_TOKEN,
		},
	});

await prepareReaderStorage("dist/server/wrangler.json", true);

execFileSync(
	"bun",
	[
		"x",
		"wrangler",
		"preview",
		"--config",
		await prepareReaderConnected("dist/server"),
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
if (process.env.GITHUB_OUTPUT)
	await appendFile(process.env.GITHUB_OUTPUT, `url=${origin}\n`);
console.log(`Preview: ${origin}/ja/auth/login`);
