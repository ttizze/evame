import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EVAME_DIR_NAME } from "../utils/constants";

export async function collectMarkdownFiles(contentDir: string): Promise<{
	files: Array<{
		slug: string;
		title: string;
		body: string;
		published_at: string | null;
	}>;
	skippedNoFrontmatterCount: number;
}> {
	// content_dir 配下の Markdown を再帰的に収集する。
	const files = await collectMarkdownPaths(contentDir);
	const result: Array<{
		slug: string;
		title: string;
		body: string;
		published_at: string | null;
	}> = [];
	const seenSlugs = new Set<string>();
	let skippedNoFrontmatterCount = 0;

	for (const filePath of files) {
		const markdown = await readFile(filePath, "utf8");
		const normalized = markdown.replace(/\r\n/g, "\n");
		if (!normalized.startsWith("---\n")) {
			// frontmatter が無いMarkdownは同期対象外として扱う（README等を誤同期しない）。
			skippedNoFrontmatterCount += 1;
			continue;
		}

		// 同期IDの安定性のため、slug はファイル名から決定する。
		const slug = filePathToSlug(filePath);
		if (seenSlugs.has(slug)) {
			throw new Error(
				`Duplicate slug detected: ${slug} (same filename-derived slug).`,
			);
		}
		seenSlugs.add(slug);

		let parsed: ReturnType<typeof parseMarkdownDocument>;
		try {
			parsed = parseMarkdownDocument(markdown);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			throw new Error(`Invalid markdown file: ${filePath}\n${message}`, {
				cause: error,
			});
		}
		result.push({
			slug,
			title: parsed.title,
			body: parsed.body,
			published_at: parsed.published_at,
		});
	}

	// API送信順を安定化するため slug 昇順で返す。
	return {
		files: result.sort((a, b) => a.slug.localeCompare(b.slug)),
		skippedNoFrontmatterCount,
	};
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
		// 管理/依存物の置き場は同期対象外。
		if (
			entry.name === EVAME_DIR_NAME ||
			entry.name === "node_modules" ||
			entry.name === ".git" ||
			entry.name === ".next" ||
			entry.name === "tipitaka-xml" ||
			entry.name === "tipitaka-md" ||
			entry.name === "cst" ||
			entry.name === "coverage" ||
			entry.name === "playwright-report" ||
			entry.name === "test-results" ||
			entry.name === "dist" ||
			entry.name === "build" ||
			entry.name === "out"
		) {
			continue;
		}
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
} {
	// 改行コード差異で差分が出ないよう LF に統一する。
	const normalized = content.replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) {
		throw new Error("frontmatter is required (title is mandatory).");
	}

	const end = normalized.indexOf("\n---\n", 4);
	if (end === -1) {
		throw new Error("frontmatter closing delimiter (---) is missing.");
	}

	const frontmatter = normalized.slice(4, end);
	const bodyRaw = normalized.slice(end + 5);
	// frontmatter直後の空行は本文から除外する。
	const body = bodyRaw.startsWith("\n") ? bodyRaw.slice(1) : bodyRaw;
	const attrs = parseSimpleYaml(frontmatter);

	const titleValue = attrs.title;
	if (typeof titleValue !== "string" || titleValue.trim() === "") {
		throw new Error("title is required.");
	}

	const publishedAt = normalizePublishedAt(attrs.published_at);
	return { title: titleValue.trim(), body, published_at: publishedAt };
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
