import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
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
		// 同期IDの安定性のため、slug はファイル名から決定する。
		const slug = filePathToSlug(filePath);

		const markdown = await readFile(filePath, "utf8");
		let parsed: ReturnType<typeof parseMarkdownDocument>;
		try {
			parsed = parseMarkdownDocument(markdown);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			throw new Error(`Invalid markdown file: ${filePath}\n${message}`, {
				cause: error,
			});
		}
		if (parsed === null) {
			// 同期対象外（published_at が無い/本文が空など）は無視する。
			continue;
		}

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

function filePathToSlug(filePath: string): string {
	// 拡張子を除いたファイル名を slug として扱う。
	const fileName = basename(filePath);
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
} | null {
	// 改行コード差異で差分が出ないよう LF に統一する。
	const normalized = content.replace(/\r\n/g, "\n");

	const withFrontmatter = parseOptionalFrontmatter(normalized);
	if (!withFrontmatter) {
		// published_at の frontmatter を持たないファイルは同期対象外。
		return null;
	}

	const attrs = parseSimpleYaml(withFrontmatter.frontmatter);
	if (!("published_at" in attrs)) {
		// frontmatter はあっても published_at が無いものは同期対象外。
		return null;
	}

	// frontmatter直後の空行は本文から除外する。
	const bodyRaw = withFrontmatter.body;
	const body = bodyRaw.startsWith("\n") ? bodyRaw.slice(1) : bodyRaw;

	const publishedAt = normalizePublishedAt(attrs.published_at);
	const derived = deriveTitleFromBody(body);
	if (!derived) {
		// タイトルを導けない（本文が空など）ファイルは同期対象外。
		return null;
	}

	return {
		title: derived.title,
		body: derived.body,
		published_at: publishedAt,
	};
}

function parseOptionalFrontmatter(
	normalizedContent: string,
): { frontmatter: string; body: string } | null {
	if (!normalizedContent.startsWith("---\n")) return null;

	const endMarker = "\n---\n";
	const end = normalizedContent.indexOf(endMarker, 4);
	if (end !== -1) {
		return {
			frontmatter: normalizedContent.slice(4, end),
			body: normalizedContent.slice(end + endMarker.length),
		};
	}
	if (normalizedContent.endsWith("\n---")) {
		return {
			frontmatter: normalizedContent.slice(4, -4),
			body: "",
		};
	}

	return null;
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
	const trimmed = input.trim();
	if (trimmed === "" || trimmed === "~") return null;
	if (trimmed.toLowerCase() === "null") return null;
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid published_at value: ${input}`);
	}
	return date.toISOString();
}

function deriveTitleFromBody(
	body: string,
): { title: string; body: string } | null {
	const lines = body.split("\n");
	let index = 0;
	while (index < lines.length) {
		const trimmed = lines[index]?.trim() ?? "";
		if (!trimmed) {
			index += 1;
			continue;
		}
		// frontmatterではない先頭の区切り線はタイトル判定から除外する。
		if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
			index += 1;
			continue;
		}
		break;
	}

	if (index >= lines.length) {
		// 本文が空のファイルは同期対象外。
		return null;
	}

	const firstLine = lines[index] ?? "";
	const h1 = extractH1Title(firstLine);
	if (h1) {
		// # 見出しを title に使う場合、本文からは削除して二重表示を避ける。
		lines.splice(index, 1);
		// 見出し直後の空行は本文から除外する。
		if ((lines[index]?.trim() ?? "") === "") {
			lines.splice(index, 1);
		}
		return { title: h1, body: lines.join("\n") };
	}

	const title = firstLine.trim();
	return title ? { title, body } : null;
}

function extractH1Title(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith("#") || trimmed.startsWith("##")) return null;
	const title = trimmed.slice(1).trim();
	return title ? title : null;
}
