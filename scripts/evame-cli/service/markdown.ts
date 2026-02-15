import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EVAME_DIR_NAME } from "../utils/constants";

export async function collectMarkdownFiles(contentDir: string): Promise<
	Array<{
		slug: string;
		title: string;
		body: string;
		published_at: string | null;
	}>
> {
	// content_dir 配下の Markdown を再帰的に収集する。
	const files = await collectMarkdownPaths(contentDir);
	const result: Array<{
		slug: string;
		title: string;
		body: string;
		published_at: string | null;
	}> = [];
	const seenSlugs = new Set<string>();

	for (const filePath of files) {
		const markdown = await readFile(filePath, "utf8");
		const parsed = parseMarkdownDocument(markdown);
		if (!parsed) {
			// frontmatter無しのMarkdown（README等）は同期対象外として無視する。
			continue;
		}

		// 同期IDの安定性のため、slug はファイル名から決定する。
		// frontmatter無しのファイルは同期対象外なので、slug重複判定にも含めない。
		const slug = filePathToSlug(filePath);
		if (seenSlugs.has(slug)) {
			throw new Error(
				`Duplicate slug detected: ${slug} (same filename-derived slug).`,
			);
		}
		seenSlugs.add(slug);
		result.push({
			slug,
			title: parsed.title,
			body: parsed.body,
			published_at: parsed.published_at,
		});
	}

	// API送信順を安定化するため slug 昇順で返す。
	return result.sort((a, b) => a.slug.localeCompare(b.slug));
}

function filePathToSlug(path: string): string {
	// 拡張子を除いたファイル名を slug として扱う。
	const fileName = path.split("/").at(-1) ?? path;
	const dot = fileName.lastIndexOf(".");
	return dot === -1 ? fileName : fileName.slice(0, dot);
}

async function collectMarkdownPaths(dir: string): Promise<string[]> {
	// 相対パス入力の揺れを避けるため絶対パスに正規化する。
	const root = resolve(dir);
	const out: string[] = [];
	await walk(root, out);
	return out;
}

async function walk(current: string, out: string[]): Promise<void> {
	const entries = await readdir(current, { withFileTypes: true });
	for (const entry of entries) {
		// 管理ファイル置き場は同期対象外。
		if (entry.name === EVAME_DIR_NAME) continue;
		const fullPath = join(current, entry.name);
		if (entry.isDirectory()) {
			await walk(fullPath, out);
			continue;
		}
		if (entry.isFile() && entry.name.endsWith(".md")) {
			out.push(fullPath);
		}
	}
}

function parseMarkdownDocument(content: string): {
	title: string;
	body: string;
	published_at: string | null;
} | null {
	// 改行コード差異で差分が出ないよう LF に統一する。
	const normalized = content.replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) {
		return null;
	}

	// 空の frontmatter (`---\n---\n`) も許容するため、探索開始は 3 とする。
	const end = normalized.indexOf("\n---\n", 3);
	if (end === -1) {
		throw new Error("frontmatter closing delimiter (---) is missing.");
	}

	const frontmatter = normalized.slice(4, end);
	const bodyRaw = normalized.slice(end + 5);
	// frontmatter直後の空行は本文から除外する。
	const rawBody = bodyRaw.startsWith("\n") ? bodyRaw.slice(1) : bodyRaw;
	const attrs = parseSimpleYaml(frontmatter);

	const lines = rawBody.split("\n");
	const startIndex = lines.findIndex((line) => line.trim() !== "");
	if (startIndex === -1) {
		throw new Error("title is required.");
	}

	const firstLine = lines[startIndex];
	const h1Match = firstLine.match(/^#\s+(.+?)\s*$/);
	const title = (h1Match ? h1Match[1] : firstLine).trim();
	if (title === "") {
		throw new Error("title is required.");
	}

	let bodyLines = lines.slice(startIndex + 1);
	// タイトル直後の空行は本文から除外する。
	if (bodyLines.length > 0 && bodyLines[0]?.trim() === "") {
		bodyLines = bodyLines.slice(1);
	}
	const body = bodyLines.join("\n");

	const publishedAt = normalizePublishedAt(attrs.published_at);
	return { title, body, published_at: publishedAt };
}

function parseSimpleYaml(text: string): Record<string, string> {
	// CLI要件を満たす最小構成の scalar 専用パーサー。
	const map: Record<string, string> = {};
	const lines = text.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const index = trimmed.indexOf(":");
		if (index <= 0) continue;

		const key = trimmed.slice(0, index).trim();
		const rawValue = trimmed.slice(index + 1).trim();
		map[key] = parseYamlScalar(rawValue);
	}

	return map;
}

function parseYamlScalar(raw: string): string {
	// "..." は JSON.parse でエスケープを正しく復元する。
	if (!raw) return "";
	if (raw.startsWith('"') && raw.endsWith('"')) {
		try {
			return JSON.parse(raw) as string;
		} catch {
			return raw.slice(1, -1);
		}
	}
	if (raw.startsWith("'") && raw.endsWith("'")) {
		// YAMLの単引用符エスケープ '' を ' に戻す。
		return raw.slice(1, -1).replace(/''/g, "'");
	}
	return raw;
}

function normalizePublishedAt(input: string | undefined): string | null {
	// 未指定は null として扱い、指定時は ISO 文字列へ正規化する。
	if (input === undefined || input === "") return null;
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid published_at value: ${input}`);
	}
	return date.toISOString();
}
