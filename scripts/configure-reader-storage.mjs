import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// バケット作成時に実行し、公開HTMLと参照アセットを期限なしで保持する。
export async function configureReaderStorage(configPath, preview) {
	const config = JSON.parse(await readFile(configPath, "utf8"));
	const bucket = (
		preview ? config.previews?.r2_buckets : config.r2_buckets
	)?.find((row) => row.binding === "PUBLIC_HTML")?.bucket_name;
	const token = process.env.CLOUDFLARE_API_TOKEN;
	if (!config.account_id || !bucket || !token)
		throw new Error(
			"PUBLIC_HTML bucket, account and CLOUDFLARE_API_TOKEN are required",
		);
	const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}/r2/buckets/${bucket}`;
	const authorization = { Authorization: `Bearer ${token}` };
	const current = await fetch(`${endpoint}/lifecycle`, {
		method: "GET",
		headers: authorization,
	});
	if (!current.ok)
		throw new Error(`R2 lifecycle read failed: HTTP ${current.status}`);
	const lifecycle = await current.json();
	if (!lifecycle.success || !Array.isArray(lifecycle.result?.rules))
		throw new Error("Invalid R2 lifecycle response");
	const rules = lifecycle.result.rules.flatMap((rule) => {
		const prefix = rule.conditions?.prefix ?? "";
		if (
			!["html/", "dependencies/", "assets/"].some(
				(retained) =>
					retained.startsWith(prefix) || prefix.startsWith(retained),
			)
		)
			return [rule];
		const { deleteObjectsTransition, ...retained } = rule;
		return retained.abortMultipartUploadsTransition ||
			retained.storageClassTransitions?.length
			? [retained]
			: [];
	});
	for (const prefix of ["changes/", "pending/"]) {
		if (
			!rules.some(
				(rule) =>
					rule.enabled &&
					rule.conditions?.prefix === prefix &&
					rule.deleteObjectsTransition,
			)
		)
			rules.push({
				id: `reader-expire-${prefix.slice(0, -1)}`,
				enabled: true,
				conditions: { prefix },
				deleteObjectsTransition: {
					condition: { type: "Age", maxAge: 172800 },
				},
			});
	}
	if (JSON.stringify(rules) !== JSON.stringify(lifecycle.result.rules)) {
		const updated = await fetch(`${endpoint}/lifecycle`, {
			method: "PUT",
			headers: { ...authorization, "Content-Type": "application/json" },
			body: JSON.stringify({ rules }),
		});
		if (!updated.ok)
			throw new Error(`R2 lifecycle update failed: HTTP ${updated.status}`);
		if (!(await updated.json()).success)
			throw new Error("R2 lifecycle update failed");
	}
	console.log(`R2の保持設定を確認しました: ${bucket}`);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const [configPath, option] = process.argv.slice(2);
	if (
		!configPath ||
		(option && option !== "--preview") ||
		process.argv.length > 4
	)
		throw new Error(
			"Usage: configure-reader-storage.mjs <wrangler.json> [--preview]",
		);
	await configureReaderStorage(configPath, option === "--preview");
}
