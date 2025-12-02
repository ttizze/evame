/**
 * マークダウンテキストからヘッダー（`# ` で始まる最初の行）と、
 * その次の行が `##` で始まる場合はそれも削除する
 */
export function removeHeader(markdown: string): {
	body: string;
} {
	const lines = markdown.split(/\r?\n/);
	const bodyLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// 最初の `# ` で始まる行（ヘッダー）をスキップ
		if (i === 0 && /^#\s+/.test(line.trim())) {
			// 次の行が `##` で始まる場合もスキップ
			if (i + 1 < lines.length && /^##\s+/.test(lines[i + 1].trim())) {
				i++; // 次の行もスキップ
			}
			continue;
		}

		bodyLines.push(line);
	}

	const body = bodyLines.join("\n").trim();
	return { body };
}
