import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(
	new URL("./switch-gateway-route.mjs", import.meta.url),
);
let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-gateway-route-"));
	await mkdir(join(directory, "gateway/dist"), { recursive: true });
	await mkdir(join(directory, "dist/server"), { recursive: true });
	await writeFile(
		join(directory, "gateway/dist/wrangler.json"),
		JSON.stringify({ name: "evame-gateway", account_id: "account" }),
	);
	await writeFile(
		join(directory, "dist/server/wrangler.json"),
		JSON.stringify({ name: "evame-start" }),
	);
	await writeFile(
		join(directory, "fetch.mjs"),
		`import {appendFile} from 'node:fs/promises'; globalThis.fetch = async (url, init) => {
  if(init.headers.Authorization !== 'Bearer test-token') throw new Error('Missing token');
  await appendFile('calls', JSON.stringify({url,method:init.method,body:init.body})+'\\n');
  const result=url.includes('/workers/routes') ? (init.method === 'PUT' ? {} : [{id:'route',pattern:'evame.tech/*',script:process.env.ROUTE_OWNER}]) : [{id:'zone'}];
  return Response.json({success:process.env.FAIL_API !== 'true',result}, {status:process.env.FAIL_API === 'true' ? 403 : 200});
 }`,
	);
});
afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});
it("既存の公開ルートだけを編集アプリからGatewayへ切り替える", async () => {
	await promisify(execFile)(
		process.execPath,
		["--import", join(directory, "fetch.mjs"), script],
		{
			cwd: directory,
			env: {
				...process.env,
				CLOUDFLARE_API_TOKEN: "test-token",
				ROUTE_OWNER: "evame-start",
			},
		},
	);
	const calls = (await readFile(join(directory, "calls"), "utf8"))
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line));
	expect(calls).toHaveLength(3);
	expect(calls[2]).toMatchObject({
		url: "https://api.cloudflare.com/client/v4/zones/zone/workers/routes/route",
		method: "PUT",
		body: JSON.stringify({ pattern: "evame.tech/*", script: "evame-gateway" }),
	});
});
it.each(["evame-gateway", "another-worker"])(
	"現在の接続先%sを上書きしない",
	async (owner) => {
		const result = promisify(execFile)(
			process.execPath,
			["--import", join(directory, "fetch.mjs"), script],
			{
				cwd: directory,
				env: {
					...process.env,
					CLOUDFLARE_API_TOKEN: "test-token",
					ROUTE_OWNER: owner,
				},
			},
		);
		if (owner === "evame-gateway") await result;
		else await expect(result).rejects.toThrow();
		expect(await readFile(join(directory, "calls"), "utf8")).not.toContain(
			'"method":"PUT"',
		);
	},
);
it("権限が不足している場合は公開先を変えず失敗する", async () => {
	await expect(
		promisify(execFile)(
			process.execPath,
			["--import", join(directory, "fetch.mjs"), script],
			{
				cwd: directory,
				env: {
					...process.env,
					CLOUDFLARE_API_TOKEN: "test-token",
					FAIL_API: "true",
				},
			},
		),
	).rejects.toThrow();
	expect(await readFile(join(directory, "calls"), "utf8")).not.toContain(
		'"method":"PUT"',
	);
});
