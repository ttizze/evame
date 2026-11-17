import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Previewとローカル成果物検証で同じ障害注入を使い、本番のentrypointは変更しない。
export async function prepareReaderConnected(directory) {
	const config = JSON.parse(
		await readFile(join(directory, "wrangler.json"), "utf8"),
	);
	const databaseFile = (await readdir(join(directory, "assets"))).find((name) =>
		/^db-.*\.m?js$/.test(name),
	);
	if (!databaseFile) throw new Error("Built database module is required");
	await writeFile(
		join(directory, "connected-worker.mjs"),
		`
import { WorkerEntrypoint } from "cloudflare:workers";
import worker, { PublicPages as ApplicationPublicPages } from ${JSON.stringify(`./${config.main}`)};
import * as databaseExports from ${JSON.stringify(`./assets/${databaseFile}`)};
const databaseModule = Object.values(databaseExports).find((value) => typeof value?.createDb === "function");
if (!databaseModule) throw new Error("Built database factory export is required");
const { createDb } = databaseModule;
export default worker;
export class PublicPages extends WorkerEntrypoint {
 constructor(ctx, env) { super(ctx, env); this.application = new ApplicationPublicPages(ctx, env); }
 async publish(changes) {
  if (changes.some((row) => row.key === "connected:publication-failure"))
   throw new Error("Injected public HTML publication failure");
  return this.application.publish(changes);
 }
 async fetch(request) {
  if (new URL(request.url).pathname === "/_astro/connected-retained.js" && request.headers.get("X-Evame-Connected-Store-Asset") === "true")
   await this.env.PUBLIC_HTML.put("assets/_astro/connected-retained.js", "export const retained = true;", {httpMetadata:{contentType:"text/javascript",cacheControl:"public, max-age=31536000, immutable"}});
  const response = await this.application.fetch(request);
  const id = request.headers.get("X-Evame-Connected-Hold");
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) return response;
  const body = await response.arrayBuffer();
  const database = createDb();
  try {
   await database.updateTable("reader_connected_barriers").set({state:"ready"}).where("id","=",id).execute();
   const deadline = Date.now() + 45000;
   while (true) {
    const barrier = await database.selectFrom("reader_connected_barriers").select("state").where("id","=",id).executeTakeFirst();
    if (barrier?.state === "released") break;
    if (Date.now() >= deadline) throw new Error("Connected cache-fill barrier timed out");
    await new Promise((resolve) => setTimeout(resolve, 25));
   }
  } finally { await database.destroy(); }
  return new Response(body, response);
 }
}
`,
	);
	const path = join(directory, "connected-wrangler.json");
	await writeFile(
		path,
		JSON.stringify({ ...config, main: "connected-worker.mjs" }),
	);
	return path;
}
