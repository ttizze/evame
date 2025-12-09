import { connect } from "@tursodatabase/serverless";
import { CamelCasePlugin, Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { TursoServerlessDialect } from "kysely-turso/serverless";

// 環境ごとにDB接続先を切り替える（本番: Turso / ローカル: SQLiteファイル）
const dialect = new TursoServerlessDialect({
	connection: connect({
		authToken: process.env.TURSO_AUTH_TOKEN!,
		url: process.env.TURSO_CONNECTION_URL!,
	}),
});

// Kysely インスタンスを作成（アプリケーション全体で共有）
export const db = new Kysely<DB>({
	dialect,
	plugins: [new CamelCasePlugin()],
});

// better-auth で使用する dialect もエクスポート
export { dialect };
