#!/usr/bin/env bun
// スクリプト実行時はDEBUGログを有効化（環境変数で上書き可能）
// すべてのインポートより前に設定する必要がある
if (!process.env.LOG_LEVEL) {
	process.env.LOG_LEVEL = "debug";
}

import { runTipitakaImport } from "./tipitaka-import/run";

void runTipitakaImport().catch((error) => {
	console.error(error);
	process.exit(1);
});
