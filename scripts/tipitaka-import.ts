#!/usr/bin/env bun
// スクリプト実行時はDEBUGログを有効化（環境変数で上書き可能）
// すべてのインポートより前に設定する必要がある
if (!process.env.LOG_LEVEL) {
	process.env.LOG_LEVEL = "debug";
}

import { Prisma } from "@prisma/client";
import { runTipitakaImport } from "./tipitaka-import/run";

void runTipitakaImport().catch((error) => {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		console.error("Prisma error:", error.message);
	} else {
		console.error(error);
	}
	process.exit(1);
});
