import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";

const reader = JSON.parse(
	await readFile("reader/dist/server/wrangler.json", "utf8"),
);
const directory = await mkdtemp(join(tmpdir(), "evame-reader-publish-"));
const configPath = join(directory, "wrangler.json");
await writeFile(
	configPath,
	JSON.stringify({
		name: "evame-reader-publisher",
		account_id: reader.account_id,
		compatibility_date: reader.compatibility_date,
		services: [{ binding: "READER", service: reader.name, remote: true }],
	}),
);
let proxy;
try {
	proxy = await getPlatformProxy({ configPath, envFiles: [], persist: false });
	if (process.argv.includes("--check-access")) {
		const response = await proxy.env.READER.fetch(
			"https://reader.internal/__publish",
		);
		await response.arrayBuffer();
		if (![404, 405].includes(response.status))
			throw new Error("Unexpected Reader access check response");
		console.log("非公開Readerへの認証済み接続を確認");
	} else {
		let total = 0;
		let locale = null;
		for (;;) {
			const response = await proxy.env.READER.fetch(
				"https://reader.internal/__publish",
				{
					method: "POST",
					headers: locale ? { "X-Evame-Reader-Locale": locale } : {},
				},
			);
			if (!response.ok)
				throw new Error(`HTML generation failed: HTTP ${response.status}`);
			const { generated, remaining, nextLocale } = await response.json();
			if (!Number.isSafeInteger(generated) || !Number.isSafeInteger(remaining))
				throw new Error("Invalid HTML generation response");
			total += generated;
			console.log(
				`公開HTMLを${total}件生成、${locale ?? "ja"}の残り${remaining}件`,
			);
			if (nextLocale === null) break;
			if (typeof nextLocale !== "string")
				throw new Error("Invalid publication locale");
			locale = nextLocale;
		}
	}
} finally {
	await proxy?.dispose();
	await rm(directory, { recursive: true, force: true });
}
