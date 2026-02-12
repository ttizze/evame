import { stat } from "node:fs/promises";

export async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		// CLI利用時の扱いを単純化するため、stat失敗は未存在として扱う。
		return false;
	}
}

export async function isDirectory(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		// 取得失敗時は「ディレクトリではない」として扱う。
		return false;
	}
}
