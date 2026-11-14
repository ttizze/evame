import { readFile } from "node:fs/promises";

const gateway = JSON.parse(
	await readFile("gateway/dist/wrangler.json", "utf8"),
);
const app = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token)
	throw new Error(
		"CLOUDFLARE_API_TOKEN is required to switch the public route",
	);

// 認証とAPIの失敗判定を、ゾーン取得・ルート取得・更新で共有する。
async function requestCloudflare(path, method, body) {
	const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		method,
		signal: AbortSignal.timeout(30_000),
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: body === null ? null : JSON.stringify(body),
	});
	const data = await response.json();
	if (!response.ok || !data.success)
		throw new Error(`Cloudflare routing API failed (HTTP ${response.status})`);
	return data.result;
}
const zones = await requestCloudflare(
	`/zones?${new URLSearchParams({ name: "evame.tech", "account.id": gateway.account_id })}`,
	"GET",
	null,
);
if (zones.length !== 1) throw new Error("evame.tech zone is not accessible");
const routes = await requestCloudflare(
	`/zones/${zones[0].id}/workers/routes`,
	"GET",
	null,
);
const route = routes.find((route) => route.pattern === "evame.tech/*");
if (!route) throw new Error("Existing evame.tech/* route was not found");
if (route.script !== gateway.name) {
	if (route.script !== app.name)
		throw new Error("Public route belongs to an unexpected Worker");
	await requestCloudflare(
		`/zones/${zones[0].id}/workers/routes/${route.id}`,
		"PUT",
		{ pattern: route.pattern, script: gateway.name },
	);
}
console.log(`Public route: evame.tech/* → ${gateway.name}`);
