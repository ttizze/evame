import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unstable_dev } from "wrangler";

const reader = JSON.parse(
	await readFile("reader/dist/server/wrangler.json", "utf8"),
);
const gateway = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const directory = await mkdtemp(join(tmpdir(), "evame-reader-purge-"));
const configPath = join(directory, "wrangler.json");
const scriptPath = join(directory, "worker.mjs");
await writeFile(
	configPath,
	JSON.stringify({
		name: gateway.name,
		account_id: reader.account_id,
		compatibility_date: reader.compatibility_date,
		services: [{ binding: "READER", service: reader.name }],
	}),
);
await writeFile(
	scriptPath,
	"export default { fetch(request, env) { return env.READER.fetch(request); } };",
);
let proxy;
try {
	// 個別Worker権限で認証できる、既存Gateway名の一時プレビューを使う。
	// 本番スクリプト・公開URL・権限は変更しない。
	proxy = await unstable_dev(scriptPath, {
		config: configPath,
		envFiles: [],
		local: false,
		ip: "127.0.0.1",
		port: 0,
		inspect: false,
		logLevel: "error",
		experimental: {
			disableDevRegistry: true,
			disableExperimentalWarning: true,
			watch: false,
		},
	});
	const response = await proxy.fetch("/__purge", { method: "POST" });
	await response.arrayBuffer();
	if (!response.ok) throw new Error("Reader cache invalidation failed");
	console.log("Readerの共有HTMLキャッシュを無効化");
} finally {
	await proxy?.stop();
	await rm(directory, { recursive: true, force: true });
}
