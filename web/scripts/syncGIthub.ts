// 必要なモジュールのインポート
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fm from "front-matter";
import { JSDOM } from "jsdom"; // HTMLパース用
import pLimit from "p-limit";

// プロジェクト固有のインポート
import { upsertTags } from "~/routes/$locale+/user.$userName+/page+/$slug+/edit/functions/mutations.server";
import { prisma } from "~/utils/prisma";
import { processMarkdownContent } from "./processMarkdownContent";

// 定数の定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_REPO = process.env.GITHUB_REPO ?? "";
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "";

if (!GITHUB_REPO || !GITHUB_OWNER) {
	throw new Error(
		"GitHub環境変数(GITHUB_REPO, GITHUB_OWNER)が設定されていません",
	);
}

const REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;
const CLONE_DIR = path.join(process.cwd(), "temp-repo");
const SKIP_FILES = ["readme.md"];

// タイプ定義
type RankingEntry = {
	rank: number;
	title: string;
	author: string;
	link: string;
};

/**
 * ranking.htmlを解析してランキングエントリを抽出する
 * @param htmlFilePath ranking.htmlのパス
 */
async function getRankingEntries(
	htmlFilePath: string,
): Promise<RankingEntry[]> {
	const htmlContent = await fs.readFile(htmlFilePath, "utf-8");
	const dom = new JSDOM(htmlContent);
	const document = dom.window.document;
	const rows = Array.from(document.querySelectorAll("table.list tr")).slice(1);
	const entries: RankingEntry[] = [];
	for (const row of rows) {
		const tds = Array.from(row.querySelectorAll("td.normal"));
		if (tds.length < 4) continue;
		const rankText = tds[0].textContent?.trim() ?? "";
		const aEl = tds[1].querySelector("a[target=_blank]");
		const titleText =
			aEl?.textContent?.trim().replace(/\r?\n/g, "").trim() ?? "";
		const link = aEl?.getAttribute("href") ?? "";
		const authorA = tds[2].querySelector("a");
		const authorText = authorA?.textContent?.trim() ?? "";

		const rankNum = Number.parseInt(rankText, 10);
		if (!Number.isNaN(rankNum) && titleText) {
			entries.push({
				rank: rankNum,
				title: titleText,
				author: authorText,
				link,
			});
		}
	}
	return entries;
}

/**
 * rankingページ用のMarkdownを生成する
 * @param rankingEntries ランキングエントリの配列
 * @param titleToSlugMap タイトルからスラグへのマップ
 * @param rankingTitle ランキングページのタイトル
 */
async function generateRankingMarkdown(
	rankingEntries: RankingEntry[],
	titleToSlugMap: Map<string, string>,
	rankingTitle = "人気ランキングページ",
): Promise<string> {
	let rankingMarkdown = `## ${rankingTitle}\n\n`;
	// ソートして順位順に並べる（念のため）
	rankingEntries.sort((a, b) => a.rank - b.rank);
	for (const entry of rankingEntries) {
		const pageSlug = titleToSlugMap.get(entry.title);
		if (pageSlug) {
			// 内部リンク
			rankingMarkdown += `${entry.rank}. [${entry.title}](/evame/page/${pageSlug}) - ${entry.author}\n`;
		} else {
			// リンクなし
			rankingMarkdown += `${entry.rank}. ${entry.title} - ${entry.author}\n`;
		}
	}
	return rankingMarkdown;
}

/**
 * GitHubリポジトリをクローンまたは最新化する
 */
async function cloneOrUpdateRepo() {
	try {
		if (!(await directoryExists(CLONE_DIR))) {
			console.log("リポジトリをクローン中...");
			execFileSync("git", ["clone", REPO_URL, CLONE_DIR], { stdio: "inherit" });
		} else {
			console.log("既にリポジトリが存在します。最新化中...");
			execFileSync("git", ["-C", CLONE_DIR, "pull"], { stdio: "inherit" });
		}
	} catch (error) {
		console.error(
			"リポジトリのクローンまたは更新中にエラーが発生しました:",
			error,
		);
		throw error;
	}
}

/**
 * ディレクトリの存在確認
 * @param dir パス
 */
async function directoryExists(dir: string): Promise<boolean> {
	try {
		const stats = await fs.stat(dir);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

/**
 * 全てのMarkdownファイルを再帰的に取得
 * @param dir ディレクトリパス
 */
async function getAllMarkdownFiles(dir: string): Promise<string[]> {
	let results: string[] = [];
	try {
		const list = await fs.readdir(dir, { withFileTypes: true });
		for (const file of list) {
			const fullPath = path.join(dir, file.name);
			if (file.isDirectory()) {
				results = results.concat(await getAllMarkdownFiles(fullPath));
			} else if (file.name.toLowerCase().endsWith(".md")) {
				results.push(fullPath);
			}
		}
	} catch (error) {
		console.error(
			`ディレクトリの読み込み中にエラーが発生しました (${dir}):`,
			error,
		);
	}
	return results;
}

/**
 * ファイルがスキップ対象か確認
 * @param fileName ファイル名
 */
function shouldSkipFile(fileName: string): boolean {
	return SKIP_FILES.includes(fileName.toLowerCase());
}

/**
 * Markdownファイルを処理
 * @param filePath ファイルパス
 * @param titleToSlugMap タイトルからスラグへのマップ
 */
async function processMarkdownFile(
	filePath: string,
	titleToSlugMap: Map<string, string>,
) {
	const fileName = path.basename(filePath).toLowerCase();
	if (shouldSkipFile(fileName)) {
		console.log(`スキップ: ${filePath}`);
		return;
	}

	try {
		const rawMarkdown = await fs.readFile(filePath, "utf-8");
		const { attributes, body } = fm<{
			tags?: string[];
			slug: string;
			author?: string;
		}>(rawMarkdown);

		if (!attributes.slug) {
			console.error("slugがありません:", filePath);
			return;
		}

		const slug = attributes.slug;
		const title = path.basename(filePath, ".md");
		titleToSlugMap.set(title, slug); // タイトルとスラグをマップに追加

		// 管理者ユーザーの取得
		const adminUser = await prisma.user.findUnique({
			where: { userName: "evame" },
		});
		if (!adminUser) {
			throw new Error("adminユーザーが見つかりません");
		}

		// Markdownコンテンツの処理
		const page = await processMarkdownContent(
			title,
			body,
			slug,
			adminUser.id,
			"en",
			true,
		);

		// タグのアップサート
		if (attributes.tags && page && page.id) {
			const tags = attributes.tags.map((tag) => `NDC${tag}`);
			await upsertTags(tags, page.id);
		}

		console.log("処理完了:", slug);
	} catch (error) {
		console.error(`❌ エラー (${filePath}):`, error);
	}
}

/**
 * Markdownの同期処理
 */
async function syncGithub() {
	try {
		// 必要なファイルの存在確認
		const htmlFilePath = join(__dirname, "ranking.html");
		try {
			await fs.access(htmlFilePath);
		} catch {
			throw new Error("ranking.htmlが見つかりません");
		}

		// リポジトリのクローンまたは更新
		await cloneOrUpdateRepo();

		// ランキングエントリの取得
		const rankingEntries = await getRankingEntries(htmlFilePath);
		const rankingTitles = new Set(rankingEntries.map((entry) => entry.title));

		// Markdownファイルの取得
		const allMarkdownFiles = await getAllMarkdownFiles(CLONE_DIR);
		console.log(`${allMarkdownFiles.length} 個のMarkdownファイルを検出`);

		// タイトルに基づいて対象ファイルをフィルタリング
		const markdownFilesToProcess = allMarkdownFiles.filter((filePath) => {
			const fileName = path.basename(filePath, ".md");
			return rankingTitles.has(fileName);
		});

		console.log(
			`${markdownFilesToProcess.length} 個のランキング対象Markdownファイルを処理します`,
		);

		// 並列処理の制限
		const limit = pLimit(10);

		// タイトルからスラグへのマップを作成
		const titleToSlugMap = new Map<string, string>();

		// ファイルの処理
		await Promise.all(
			markdownFilesToProcess.map((filePath) =>
				limit(() => processMarkdownFile(filePath, titleToSlugMap)),
			),
		);

		// ランキングページの生成
		const rankingMarkdown = await generateRankingMarkdown(
			rankingEntries,
			titleToSlugMap,
		);
		const rankingPageSlug = "aozorabunko-popularity-ranking";

		// 管理者ユーザーの取得（既に取得済みの場合はキャッシュすることも検討）
		const adminUser = await prisma.user.findUnique({
			where: { userName: "evame" },
		});
		if (!adminUser) {
			throw new Error("adminユーザーが見つかりません(ランキングページ生成時)");
		}

		// ランキングMarkdownの処理
		await processMarkdownContent(
			"人気ランキングページ",
			rankingMarkdown,
			rankingPageSlug,
			adminUser.id,
			"en",
			true,
		);

		console.log("ランキングページを作成または更新しました:", rankingPageSlug);
	} catch (error) {
		console.error("Markdownの同期中にエラーが発生しました:", error);
	} finally {
		console.log("クローンリポジトリは保持されます:", CLONE_DIR);
	}
}

// 実行部分
(async () => {
	await syncGithub();
})();
