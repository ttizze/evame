#!/usr/bin/env bun
// 目的: CLI エントリーポイントで変換ワークフローを起動する。
// 処理: `runConversionCli` を呼び出し、失敗時はエラーを表示して終了する。
import { runConversionCli } from "./convert-romn-to-md/cli";

void runConversionCli().catch((error) => {
	console.error("Conversion failed:", error);
	process.exit(1);
});
