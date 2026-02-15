import { createHash } from "node:crypto";

/**
 * ページの Revision（版ID）を算出する。
 * 内容から決定的に算出するハッシュ値で、DBに保存せず都度算出する。
 *
 * アルゴリズム:
 * 1. "{slug}.md\t{SHA256(body)}\t{published_at_or_empty}\t{title}" を作る
 * 2. 上記文字列の SHA256 = Revision
 */
export function computeRevision(params: {
	slug: string;
	title: string;
	body: string;
	publishedAt: Date | null;
}): string {
	const fileName = `${params.slug}.md`;
	const bodyHash = createHash("sha256").update(params.body).digest("hex");
	const publishedAtStr = params.publishedAt
		? params.publishedAt.toISOString()
		: "";

	const input = `${fileName}\t${bodyHash}\t${publishedAtStr}\t${params.title}`;
	return createHash("sha256").update(input).digest("hex");
}
