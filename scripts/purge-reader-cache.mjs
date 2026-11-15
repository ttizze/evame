import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unstable_dev } from "wrangler";

const app = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const directory = await mkdtemp(join(tmpdir(), "evame-reader-purge-"));
const configPath = join(directory, "wrangler.json");
const scriptPath = join(directory, "worker.mjs");
await writeFile(
	configPath,
	JSON.stringify({
		name: app.name,
		account_id: app.account_id,
		compatibility_date: app.compatibility_date,
		services: [
			{ binding: "PUBLIC_PAGES", service: app.name, entrypoint: "PublicPages" },
		],
	}),
);
await writeFile(
	scriptPath,
	"export default { async fetch(request, env) { await env.PUBLIC_PAGES.clearCache(); return new Response(null, { status: 204 }); } };",
);
let proxy;
try {
	// 個別Worker権限で認証できる、統合Worker名の一時プレビューを使う。
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
	if (!response.ok) throw new Error("Public HTML cache invalidation failed");
	console.log("公開HTMLキャッシュを無効化");
} finally {
	await proxy?.stop();
	await rm(directory, { recursive: true, force: true });
}
