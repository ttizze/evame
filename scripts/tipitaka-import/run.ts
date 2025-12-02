import { prisma } from "@/lib/prisma";
import { readBooksJson } from "./books";
import { setupCategoryPages } from "./_setup-category-pages/application/setup-category-pages";
import { SYSTEM_USER_HANDLE } from "./constants";
import { importAllContentPages } from "./_content-pages/application/import-all-content-pages";
import { setupInitialRequirements } from "./_initial-setup/application/setup-initial-requirements";
import { findUserByHandle } from "./_initial-setup/db/users";

export async function runTipitakaImport(): Promise<void> {
	try {
		// Step 0: 取り込み先となるシステムユーザ（evame）が存在するか確認する
		const user = await findUserByHandle(SYSTEM_USER_HANDLE);
		if (!user) {
			throw new Error(
				`User with handle ${SYSTEM_USER_HANDLE} not found. Create user first.`,
			);
		}

		// Step 1: セグメントタイプ、メタデータタイプ、ルートページの初期セットアップ
		const { primarySegmentType, commentarySegmentTypeIdByLabel, rootPage } =
			await setupInitialRequirements(user.id);

		// Step 2-3: books.jsonから各Tipitakaファイルのメタデータを取得し、
		// カテゴリツリーを構築してカテゴリページを作成する
		const { tipitakaFileMetas } = await readBooksJson();
		const categoryPageLookup = await setupCategoryPages(
			tipitakaFileMetas,
			rootPage,
			user.id,
			primarySegmentType.id,
		);

		// Step 4: すべてのコンテンツページをインポート
		await importAllContentPages(
			tipitakaFileMetas,
			categoryPageLookup,
			user.id,
			primarySegmentType.id,
			commentarySegmentTypeIdByLabel,
		);
	} finally {
		await prisma.$disconnect();
	}
}
