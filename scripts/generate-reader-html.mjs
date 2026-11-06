import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unstable_dev } from "wrangler";
import { supportedLocaleOptions } from "../src/app/_constants/locale.ts";

const reader = JSON.parse(
	await readFile("reader/dist/server/wrangler.json", "utf8"),
);
const gateway = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const directory = await mkdtemp(join(tmpdir(), "evame-reader-publish-"));
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
	if (process.argv.includes("--check-access")) {
		const response = await proxy.fetch("/__publish");
		await response.arrayBuffer();
		if (![404, 405].includes(response.status))
			throw new Error("Unexpected Reader access check response");
		console.log("非公開Readerへの認証済み接続を確認");
	} else {
		let total = 0;
		const publicationId = randomUUID();
		/** 公開操作を繰り返さず、HTML生成バッチだけを同じ生成IDで再試行する。 */
		async function generateBatch(locale) {
			let failures = 0;
			for (;;) {
				const response = await proxy.fetch("/__publish", {
					method: "POST",
					headers: {
						"X-Evame-Reader-Locale": locale,
						"X-Evame-Reader-Defer-Purge": "true",
						"X-Evame-Reader-Publication": publicationId,
					},
				});
				if (!response.ok) {
					await response.arrayBuffer();
					if (response.status >= 500 && failures < 8) {
						await new Promise((resolve) =>
							setTimeout(
								resolve,
								Math.min(30000, 1000 * 2 ** failures++) + Math.random() * 500,
							),
						);
						continue;
					}
					throw new Error(`HTML generation failed: HTTP ${response.status}`);
				}
				const { generated, remaining, nextLocale } = await response.json();
				if (
					!Number.isSafeInteger(generated) ||
					!Number.isSafeInteger(remaining)
				)
					throw new Error("Invalid HTML generation response");
				total += generated;
				console.log(`公開HTMLを${total}件生成、${locale}の残り${remaining}件`);
				if (remaining > 0 && nextLocale !== locale)
					throw new Error("Invalid publication locale");
				return remaining;
			}
		}
		const firstBatch = generateBatch("ja");
		const results = await Promise.allSettled(
			supportedLocaleOptions.map(async ({ code: locale }) => {
				const remaining = await firstBatch.catch((error) => {
					if (locale === "ja") throw error;
					return 0;
				});
				if (locale === "ja" && remaining === 0) return;
				for (;;) {
					if ((await generateBatch(locale)) === 0) return;
				}
			}),
		);
		const purged = await proxy.fetch("/__purge", { method: "POST" });
		await purged.arrayBuffer();
		if (!purged.ok) throw new Error("Reader cache invalidation failed");
		for (const result of results)
			if (result.status === "rejected") throw result.reason;
	}
} finally {
	await proxy?.stop();
	await rm(directory, { recursive: true, force: true });
}
