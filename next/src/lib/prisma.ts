import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
const connectionString = `${process.env.DATABASE_URL || ""}?connect_timeout=15&pool_timeout=15`;

// ローカル開発環境用の設定
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
if (isDevelopment || isTest) {
	const LOCAL_HOST = "db.localtest.me";

	const getLocalPort = () => (isTest ? 4445 : 4444);

	// テスト環境の場合は、ホストが db.localtest.me のときのポートをテスト用に変更
	neonConfig.fetchEndpoint = (host) => {
		if (host === LOCAL_HOST) {
			// テストなら 4445、本番開発なら 4444
			return `http://${host}:${getLocalPort()}/sql`;
		}
		return `https://${host}:${443}/sql`;
	};

	// WebSocket のセキュリティ設定
	const connectionStringUrl = new URL(connectionString);
	neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== LOCAL_HOST;

	// wsProxy の設定
	neonConfig.wsProxy = (host) => {
		if (host === LOCAL_HOST) {
			return `${host}:${getLocalPort()}/v2`;
		}
		return `${host}/v2`;
	};
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
