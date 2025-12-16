import { createServerLogger } from "@/lib/logger.server";
import { importAllContentPages } from "./_content-pages/application/import-all-content-pages";
import { createCategoryPages } from "./_create-category-pages/application/create-category-pages";
import { setupInitialRequirements } from "./_initial-setup/application/setup-initial-requirements";
import { findUserByHandle } from "./_initial-setup/db/users";
import { readBooksJson } from "./utils/books";
import { SYSTEM_USER_HANDLE } from "./utils/constants";

export async function runTipitakaImport(): Promise<void> {
	const logger = createServerLogger("tipitaka-import");
	logger.info(
		{ logLevel: process.env.LOG_LEVEL || "default" },
		"Starting Tipitaka import",
	);
	// Step 0: 取り込み先となるシステムユーザ（evame）が存在するか確認する
	const user = await findUserByHandle(SYSTEM_USER_HANDLE);
	if (!user) {
		throw new Error(
			`User with handle ${SYSTEM_USER_HANDLE} not found. Create user first.`,
		);
	}

	// Step 1: セグメントタイプ、メタデータタイプ、ルートページの初期セットアップ
	const { rootPageId } = await setupInitialRequirements(user.id);

	// Step 2-3: books.jsonから各Tipitakaファイルのメタデータを取得し、
	// カテゴリツリーを構築してカテゴリページを作成する
	const { tipitakaFileMetas } = await readBooksJson();
	const categoryPageLookup = await createCategoryPages(
		tipitakaFileMetas,
		rootPageId,
		user.id,
	);

	// Step 4: すべてのコンテンツページをインポート
	await importAllContentPages(
		tipitakaFileMetas,
		categoryPageLookup,
		rootPageId,
		user.id,
	);
}
