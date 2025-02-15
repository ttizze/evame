import { processPageHtml } from "@/app/[locale]/user/[handle]/page/[slug]/edit/lib/process-page-html";
import { prisma } from "@/lib/prisma";

// 全ページに対して処理を実行するメイン関数
async function main(): Promise<void> {
	// 1. DB から全ページを取得
	const pages = await prisma.page.findMany({
		include: {
			pageSegments: { where: { number: 0 } },
		},
	});

	// 2. 取得したページを順番に処理
	for (const page of pages) {
		if (!page.pageSegments[0]) {
			console.log(
				`pageSegments[0] が存在しません。userId=${page.userId}, sourceLocale=${page.sourceLocale}, status=${page.status}`,
			);
			// スキップする場合は continue を使用
			continue;
		}
		// 例: pageSlug プロパティ名が異なる場合は適宜修正
		await processPageHtml(
			page.pageSegments[0].text,
			page.content,
			page.slug,
			page.userId,
			page.sourceLocale,
		);
	}

	console.log("全ページの処理が完了しました。");
}

// スクリプト実行
main().catch((error) => {
	console.error("ページ処理中にエラーが発生しました:", error);
	process.exit(1);
});
