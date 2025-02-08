#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

/**
 * キャメルケースのファイル名をケバブケースに変換する関数
 * 例: "exampleFileName.txt" → "example-file-name.txt"
 *
 * @param filename 変換対象のファイル名
 * @returns 変換後のファイル名（すでに小文字のみの場合はそのまま返す）
 */
function camelToKebab(filename: string): string {
	// 拡張子を分離（例: "exampleFileName.txt" → base="exampleFileName", ext=".txt"）
	const ext = path.extname(filename);
	const base = path.basename(filename, ext);

	// すでに小文字のみ（＝ケバブケースと判断）ならそのまま返す
	if (base === base.toLowerCase()) {
		return filename;
	}

	// キャメルケースからケバブケースへの変換処理
	// ① 「小文字or記号 + 大文字＋小文字」の部分でハイフンを挿入
	const s1 = base.replace(/(.)([A-Z][a-z]+)/g, "$1-$2");
	// ② 「小文字or数字 + 大文字」のパターンにもハイフンを挿入し、全体を小文字に変換
	const kebabBase = s1.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

	// 拡張子も小文字に変換して連結
	return kebabBase + ext.toLowerCase();
}

/**
 * 指定したディレクトリ内のファイルを再帰的に処理する関数
 *
 * @param dir 処理対象のディレクトリパス
 */
function processDirectory(dir: string): void {
	const items = fs.readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stats = fs.statSync(fullPath);

		if (stats.isDirectory()) {
			processDirectory(fullPath);
		} else if (stats.isFile()) {
			const newName = camelToKebab(item);
			if (newName !== item) {
				const newPath = path.join(dir, newName);
				console.log(`Renaming: ${fullPath} -> ${newPath}`);
				fs.renameSync(fullPath, newPath);
			}
		}
	}
}

processDirectory("./src");
