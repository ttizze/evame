#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

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

  // キャメルケースからケバブケースへ変換する処理
  // ① 「小文字or記号 + 大文字＋小文字」の部分でハイフンを挿入
  const s1 = base.replace(/(.)([A-Z][a-z]+)/g, '$1-$2');
  // ② 「小文字or数字 + 大文字」のパターンにもハイフンを挿入し、全体を小文字に変換
  const kebabBase = s1.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  // 拡張子も小文字に変換して連結
  return kebabBase + ext.toLowerCase();
}

// カレントディレクトリ内の全ファイルを対象に処理
const currentDir = './src/app/[locale]/user/[handle]/page/[slug]/comment/components';
const files = fs.readdirSync(currentDir);

files.forEach(file => {
  const filePath = path.join(currentDir, file);
  const stats = fs.statSync(filePath);
  if (stats.isFile()) {
    const newName = camelToKebab(file);
    if (newName !== file) {
      console.log(`Renaming: ${file} -> ${newName}`);
      fs.renameSync(filePath, path.join(currentDir, newName));
    }
  }
});
