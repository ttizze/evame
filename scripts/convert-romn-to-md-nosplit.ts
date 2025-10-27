#!/usr/bin/env bun
// ノンチャプター版のエントリーポイント
import { runConversionCliNoSplit } from "./convert-romn-to-md-nosplit/cli";

void runConversionCliNoSplit().catch((error) => {
	console.error("Conversion (nosplit) failed:", error);
	process.exit(1);
});
