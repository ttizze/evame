import { ensureTemplateDatabase } from "./src/tests/test-db-manager";

/**
 * Vitestのグローバルセットアップ関数
 *
 * ## 実行タイミング
 * - vitest.config.ts の globalSetup に指定されている
 * - 全てのテストが実行される前に **1回だけ** 実行される
 * - watchモードでも最初の1回だけ実行され、ファイル変更後の再実行では実行されない
 *
 * ## やっていること
 * 1. テンプレートDBを準備（マイグレーション + マスターデータ投入）
 * 2. DATABASE_URLをクリア
 *
 * ## DATABASE_URLをクリアする理由
 * ensureTemplateDatabase()の中で process.env.DATABASE_URL = templateDbUrl が設定される。
 * この状態でテストファイルがロードされると、テストファイル内でimportされたPrismaクライアントが
 * テンプレートDBに接続してしまう。
 *
 * 例: テストファイルの先頭で `import { prisma } from "@/lib/prisma"` があると、
 * その時点でPrismaクライアントが初期化され、DATABASE_URLに設定されているDBに接続する。
 * もしDATABASE_URLがテンプレートDBを指していると、テストデータがテンプレートDBに書き込まれ、
 * 他のテストファイルがテンプレートDBをクローンしたときに汚染されたデータが伝播してしまう。
 *
 * DATABASE_URLをクリアしておけば、テストファイルがロードされた時点ではPrismaは接続先を持たず、
 * setupDbPerFile()で適切なDB（テストファイル固有のクローンDB）が設定された後に接続される。
 */
export async function setup() {
	await ensureTemplateDatabase();
	delete process.env.DATABASE_URL;
	console.log("[GlobalSetup] Template database setup completed.");
}
