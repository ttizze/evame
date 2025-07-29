// scripts/cleanup-markdown.ts

import fs from "node:fs/promises";
import fg from "fast-glob";

async function run() {
	const files = await fg("tipitaka-md/**/*.md");
	const bulletNoLink = /^\*\s+[^[]/;
	const breadcrumb = /^\[Home].*|Go to (previous|parent|next) page/;

	for (const file of files) {
		const src = await fs.readFile(file, "utf8");
		// 1) 行単位で不要行を除去
		const lines = src
			.split(/\r?\n/)
			.filter((l) => !bulletNoLink.test(l) && !breadcrumb.test(l));

		// 2) 連続する空行を 1 行に圧縮
		const compacted: string[] = [];
		for (const line of lines) {
			if (line.trim() === "") {
				if (compacted.length === 0) continue; // 先頭の空行を除去
				if (compacted[compacted.length - 1].trim() === "") continue; // 連続空行をスキップ
			}
			compacted.push(line);
		}

		// 3) 末尾の空行を除去し、末尾に改行を 1 つだけ付与
		while (compacted.length && compacted[compacted.length - 1].trim() === "") {
			compacted.pop();
		}
		const cleaned = `${compacted.join("\n").trimEnd()}\n`;

		await fs.writeFile(file, cleaned);
	}
	console.log("Cleanup complete");
}
run();
