/**
 * マークダウンテキストをヘッダーと本文に分割する
 */
export function splitHeaderAndBody(markdown: string): {
	header: string;
	body: string;
} {
	const lines = markdown.split(/\r?\n/);
	let header = "";
	const bodyLines: string[] = [];
	for (const line of lines) {
		if (!header && /^#\s+/.test(line.trim())) {
			header = line.replace(/^#\s+/, "").trim();
			continue;
		}
		bodyLines.push(line);
	}
	const body = bodyLines.join("\n").trim();
	return { header, body };
}
