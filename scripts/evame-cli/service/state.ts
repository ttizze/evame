import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EVAME_DIR_NAME, STATE_FILE_NAME } from "../utils/constants";
import { fileExists } from "../utils/filesystem";

export async function loadState(cwd: string) {
	// 各 slug の最終適用 revision を .evame/state.json から読み込む。
	const path = join(cwd, EVAME_DIR_NAME, STATE_FILE_NAME);
	const exists = await fileExists(path);
	if (!exists) {
		// 初回実行では state ファイル未作成が正常。
		const slugs: Record<string, { last_applied_revision: string }> = {};
		return { slugs };
	}

	const raw = await readFile(path, "utf8");
	const parsed = JSON.parse(raw) as { slugs?: unknown };
	if (!parsed || typeof parsed !== "object" || !parsed.slugs) {
		throw new Error("Invalid state.json format.");
	}
	if (typeof parsed.slugs !== "object") {
		throw new Error("Invalid state.json format.");
	}

	const slugs: Record<string, { last_applied_revision: string }> = {};
	for (const [slug, value] of Object.entries(parsed.slugs)) {
		// state の内部形式を最小限検証し、壊れたJSONを早期に検出する。
		if (
			!value ||
			typeof value !== "object" ||
			!("last_applied_revision" in value) ||
			typeof value.last_applied_revision !== "string"
		) {
			throw new Error("Invalid state.json format.");
		}
		slugs[slug] = { last_applied_revision: value.last_applied_revision };
	}

	return { slugs };
}

export async function saveState(
	cwd: string,
	state: Awaited<ReturnType<typeof loadState>>,
): Promise<void> {
	// 人間の確認・競合解消を考慮して整形JSONで保存する。
	await mkdir(join(cwd, EVAME_DIR_NAME), { recursive: true });
	const path = join(cwd, EVAME_DIR_NAME, STATE_FILE_NAME);
	await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function applyPullResultToLocal(params: {
	contentDir: string;
	pages: Array<{
		slug: string;
		revision: string;
		title: string;
		body: string;
		published_at: string | null;
	}>;
	force: boolean;
	state: Awaited<ReturnType<typeof loadState>>;
}): Promise<{
	nextState: Awaited<ReturnType<typeof loadState>>;
	writtenSlugs: string[];
	skippedSlugs: string[];
	removedSlugs: string[];
}> {
	// pull 反映先ディレクトリを確実に作成する。
	await mkdir(params.contentDir, { recursive: true });

	const nextState: Awaited<ReturnType<typeof loadState>> = {
		slugs: { ...params.state.slugs },
	};
	const writtenSlugs: string[] = [];
	const skippedSlugs: string[] = [];
	const serverSlugSet = new Set<string>();

	// ファイル反映順を固定して、実行ごとの結果の揺れを抑える。
	for (const page of [...params.pages].sort((a, b) =>
		a.slug.localeCompare(b.slug),
	)) {
		serverSlugSet.add(page.slug);
		const path = join(params.contentDir, `${page.slug}.md`);
		const nextContent = toMarkdownDocument(page);
		const currentContent = (await fileExists(path))
			? await readFile(path, "utf8")
			: null;

		if (
			currentContent !== null &&
			currentContent !== nextContent &&
			!params.force
		) {
			// --force がない限り、ローカル編集を保持する。
			skippedSlugs.push(page.slug);
			continue;
		}

		if (currentContent !== nextContent) {
			// 内容が変わるときだけ書き込み、不要な更新時刻変化を避ける。
			await writeFile(path, nextContent, "utf8");
			writtenSlugs.push(page.slug);
		}

		// ファイル反映済み slug の revision を最新化する。
		nextState.slugs[page.slug] = { last_applied_revision: page.revision };
	}

	const removedSlugs: string[] = [];
	for (const slug of Object.keys(nextState.slugs)) {
		if (serverSlugSet.has(slug)) continue;
		// リモートに存在しないページの同期メタデータは削除する。
		delete nextState.slugs[slug];
		removedSlugs.push(slug);
	}

	removedSlugs.sort((a, b) => a.localeCompare(b));
	return { nextState, writtenSlugs, skippedSlugs, removedSlugs };
}

function toMarkdownDocument(page: {
	title: string;
	body: string;
	published_at: string | null;
}): string {
	// published_at はメタデータとして frontmatter に残し、title は本文の先頭見出しにする。
	const parts: string[] = [];
	parts.push(
		["---", `published_at: ${JSON.stringify(page.published_at)}`, "---"].join(
			"\n",
		),
	);

	const title = page.title.trim();
	if (title) {
		parts.push(`# ${title}`);
	}

	const body = page.body.endsWith("\n") ? page.body : `${page.body}\n`;
	parts.push(body);

	return parts.join("\n\n");
}
