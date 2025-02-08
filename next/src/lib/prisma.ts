import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
let connectionString = process.env.DATABASE_URL || "";

// ローカル開発環境用の設定
if (process.env.NODE_ENV === "development") {
	// ローカル用の接続文字列（例: db.localtest.me を使って Neon に近い環境をエミュレート）
	connectionString = "postgres://postgres:postgres@db.localtest.me:5434/main";

	// fetchEndpoint の設定（db.localtest.me の場合は http://host:4444/sql を使う）
	neonConfig.fetchEndpoint = (host) => {
		const [protocol, port] =
			host === "db.localtest.me" ? ["http", 4444] : ["https", 443];
		return `${protocol}://${host}:${port}/sql`;
	};

	// WebSocket のセキュリティ設定をローカル用に調整
	const connectionStringUrl = new URL(connectionString);
	neonConfig.useSecureWebSocket =
		connectionStringUrl.hostname !== "db.localtest.me";

	// wsProxy の設定（ローカル用）
	neonConfig.wsProxy = (host) =>
		host === "db.localtest.me" ? `${host}:4444/v2` : `${host}/v2`;
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
