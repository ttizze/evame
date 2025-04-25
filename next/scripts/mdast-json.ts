import "dotenv/config";
import { Client } from "pg";
import { htmlToMdastWithSegments } from "@/app/[locale]/_lib/html-to-mdast-with-segments";

/* ─── 設定 ───────────────────────────── */
const SCHEMA = process.env.PG_SCHEMA ?? "public";
const BATCH = +(process.env.MIGRATE_BATCH ?? 200);

/* テーブルごとの設定を配列で並べるだけ */
const JOBS: {
	table: string;
	htmlCol: string;
	idCol?: string; // デフォルト id
}[] = [
	{ table: "pages", htmlCol: "content" },
	{ table: "page_comments", htmlCol: "content" },
	{ table: "projects", htmlCol: "description" },
];

/* ─── メイン ─────────────────────────── */
async function migrate() {
	const db = new Client({ connectionString: process.env.DATABASE_URL });
	await db.connect();
	await db.query(`SET search_path TO ${SCHEMA};`);

	for (const job of JOBS) {
		const t = `${SCHEMA}.${job.table}`;
		const id = job.idCol ?? "id";

		console.log(`\n### migrating ${t} …`);

		/* ページングで全行を 1 回ずつ処理 */
		let lastId = 0;
		while (true) {
			const rows = (
				await db.query(
					`SELECT ${id}, ${job.htmlCol} AS html
            FROM ${t}
            WHERE ${id} > $1
            ORDER BY ${id}
            LIMIT $2`,
					[lastId, BATCH],
				)
			).rows;

			if (!rows.length) break;

			for (const r of rows) {
				const { mdastJson } = await htmlToMdastWithSegments({ html: r.html });
				await db.query(
					`UPDATE ${t}
              SET mdast_json = $1::jsonb
            WHERE ${id} = $2`,
					[JSON.stringify(mdastJson), r[id]],
				);
				console.log(`✔ ${job.table} ${r[id]}`);
				lastId = r[id];
			}
		}
		console.log(`✓ ${job.table} finished`);
	}

	await db.end();
	console.log("\n✅ ALL migrations finished");
}

migrate().catch((e) => {
	console.error(e);
	process.exit(1);
});
