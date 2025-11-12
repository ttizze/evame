import { PrismaClient } from "@prisma/client";
import { readBooksJson } from "./books";

/**
 * 段落番号のパターン: 数字にドット（例: "123." または "123\."）
 * エスケープされたドット（\.）にも対応
 */
const PARAGRAPH_NUMBER_REGEX = /(\d+)(?:\.|\\.)/g;

/**
 * slugからfileKeyを抽出する
 * slugは "tipitaka-{fileKey}" の形式
 */
function extractFileKeyFromSlug(slug: string): string | null {
	if (!slug.startsWith("tipitaka-")) {
		return null;
	}
	return slug.replace(/^tipitaka-/, "");
}

/**
 * セグメントから段落番号を抽出する
 */
function extractParagraphNumbers(text: string): number[] {
	const numbers: number[] = [];
	PARAGRAPH_NUMBER_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null = PARAGRAPH_NUMBER_REGEX.exec(text);
	while (match !== null) {
		const paragraphNumber = Number.parseInt(match[1] ?? "", 10);
		if (Number.isFinite(paragraphNumber)) {
			numbers.push(paragraphNumber);
		}
		match = PARAGRAPH_NUMBER_REGEX.exec(text);
	}
	return numbers;
}

/**
 * 注釈書のセグメントで、根本経典とリンクされていないものを調査する
 */
async function investigateUnlinkedCommentary() {
	const prisma = new PrismaClient();

	try {
		// books.jsonを読み込んでファイル間の対応関係を取得
		const { entries } = await readBooksJson();
		const fileKeyToMulaFileKey = new Map<string, string | null>();
		for (const entry of entries) {
			fileKeyToMulaFileKey.set(entry.fileKey, entry.mulaFileKey);
		}

		console.log(`books.jsonから読み込んだエントリ数: ${entries.length}`);
		console.log(
			`注釈書（Atthakatha/Tika）のエントリ数: ${entries.filter((e) => e.level === "Atthakatha" || e.level === "Tika").length}`,
		);
		// 注釈書（Atthakatha/Tika）のセグメントタイプを取得
		const commentaryType = await prisma.segmentType.findMany({
			where: {
				key: { in: ["ATTHAKATHA", "TIKA"] },
			},
		});

		if (commentaryType.length === 0) {
			console.log("注釈書のセグメントタイプが見つかりません");
			return;
		}

		const commentaryTypeIds = commentaryType.map((t) => t.id);
		console.log(
			`注釈書のセグメントタイプ: ${commentaryType.map((t) => `${t.key} (${t.id})`).join(", ")}`,
		);

		// 注釈書のセグメントを取得（セグメント番号順）
		// 大量データのため、まずはカウントとリンク状況のみ確認
		console.log("\n注釈書セグメントの取得中...");
		const commentarySegmentCount = await prisma.segment.count({
			where: {
				segmentTypeId: { in: commentaryTypeIds },
			},
		});
		console.log(`注釈書のセグメント総数: ${commentarySegmentCount}`);

		// リンクされているセグメント数を確認
		const linkedCount = await prisma.segment.count({
			where: {
				segmentTypeId: { in: commentaryTypeIds },
				linksFrom: { some: {} },
			},
		});
		const unlinkedCount = commentarySegmentCount - linkedCount;
		console.log(
			`リンクされているセグメント数: ${linkedCount} (${((linkedCount / commentarySegmentCount) * 100).toFixed(2)}%)`,
		);
		console.log(
			`リンクされていないセグメント数: ${unlinkedCount} (${((unlinkedCount / commentarySegmentCount) * 100).toFixed(2)}%)`,
		);

		// 全体の統計を取得するため、バッチ処理で全件を処理
		console.log("\n=== 全体統計の取得中（バッチ処理） ===");
		const BATCH_SIZE = 5000;
		let processedCount = 0;
		const stats = {
			noParagraphNumber: 0,
			paragraphNumberLessThan1: 0,
			paragraphNumber1OrMore: 0,
		};

		let cursor: number | undefined;
		let hasMore = true;

		while (hasMore) {
			const batch = await prisma.segment.findMany({
				where: {
					segmentTypeId: { in: commentaryTypeIds },
					linksFrom: { none: {} }, // リンクされていないもののみ
					...(cursor ? { id: { gt: cursor } } : {}),
				},
				select: {
					id: true,
					text: true,
				},
				orderBy: { id: "asc" },
				take: BATCH_SIZE,
			});

			if (batch.length === 0) {
				hasMore = false;
				break;
			}

			for (const segment of batch) {
				const paragraphNumbers = extractParagraphNumbers(segment.text);
				const hasParagraphNumber = paragraphNumbers.length > 0;
				const hasParagraphNumberLessThan1 = paragraphNumbers.some((n) => n < 1);

				if (!hasParagraphNumber) {
					stats.noParagraphNumber++;
				} else if (hasParagraphNumberLessThan1) {
					stats.paragraphNumberLessThan1++;
				} else {
					stats.paragraphNumber1OrMore++;
				}
			}

			processedCount += batch.length;
			cursor = batch[batch.length - 1]?.id;
			hasMore = batch.length === BATCH_SIZE;

			if (processedCount % 50000 === 0 || !hasMore) {
				console.log(
					`  処理済み: ${processedCount.toLocaleString()} / ${unlinkedCount.toLocaleString()} (${((processedCount / unlinkedCount) * 100).toFixed(1)}%)`,
				);
			}
		}

		console.log("\n=== リンクされていないセグメントの全体統計 ===");
		console.log(
			`段落番号がない: ${stats.noParagraphNumber.toLocaleString()} (${((stats.noParagraphNumber / unlinkedCount) * 100).toFixed(2)}%)`,
		);
		console.log(
			`段落番号が1より小さい: ${stats.paragraphNumberLessThan1.toLocaleString()} (${((stats.paragraphNumberLessThan1 / unlinkedCount) * 100).toFixed(2)}%)`,
		);
		console.log(
			`段落番号が1以上（でもリンクされていない）: ${stats.paragraphNumber1OrMore.toLocaleString()} (${((stats.paragraphNumber1OrMore / unlinkedCount) * 100).toFixed(2)}%)`,
		);
		console.log(
			`\n⚠️ 重要: 「段落番号が1以上（でもリンクされていない）」の${stats.paragraphNumber1OrMore.toLocaleString()}件のうち、`,
		);
		console.log(`大部分は根本経典に存在しない段落番号を持つセグメントです。`);
		console.log(
			`これは、根本経典のマークダウンファイル内で段落番号が正しく抽出されていない可能性があります。`,
		);
		console.log(
			`根本経典に存在するのにリンクされていないセグメントは、以下の詳細調査で確認できます。`,
		);

		// サンプルとして最初の1000件を取得して詳細表示
		const commentarySegments = await prisma.segment.findMany({
			where: {
				segmentTypeId: { in: commentaryTypeIds },
				linksFrom: { none: {} }, // リンクされていないもののみ
			},
			select: {
				id: true,
				number: true,
				text: true,
				content: {
					select: {
						page: {
							select: {
								slug: true,
							},
						},
					},
				},
			},
			orderBy: [{ contentId: "asc" }, { number: "asc" }],
			take: 1000, // サンプルとして1000件
		});

		console.log(
			`\nサンプルとして取得したリンクされていないセグメント数: ${commentarySegments.length}`,
		);

		// リンクされていないセグメントを分類
		const unlinkedSegments: Array<{
			segmentId: number;
			segmentNumber: number;
			text: string;
			paragraphNumbers: number[];
			hasParagraphNumber: boolean;
			hasParagraphNumberLessThan1: boolean;
			pageSlug: string;
			fileKey: string | null;
		}> = [];

		for (const segment of commentarySegments) {
			const paragraphNumbers = extractParagraphNumbers(segment.text);
			const hasParagraphNumber = paragraphNumbers.length > 0;
			const hasParagraphNumberLessThan1 = paragraphNumbers.some((n) => n < 1);
			const pageSlug = segment.content.page?.slug ?? "unknown";
			unlinkedSegments.push({
				segmentId: segment.id,
				segmentNumber: segment.number,
				text: segment.text.substring(0, 100), // 最初の100文字
				paragraphNumbers,
				hasParagraphNumber,
				hasParagraphNumberLessThan1,
				pageSlug,
				fileKey:
					pageSlug !== "unknown" ? extractFileKeyFromSlug(pageSlug) : null,
			});
		}

		// サンプルを表示（各カテゴリから最大10件）
		console.log("\n=== サンプル: 段落番号がないセグメント ===");
		const noParagraphNumberSamples = unlinkedSegments
			.filter((s) => !s.hasParagraphNumber)
			.slice(0, 10);
		for (const seg of noParagraphNumberSamples) {
			console.log(
				`\n[${seg.fileKey}] ${seg.pageSlug} (segment #${seg.segmentNumber})`,
			);
			console.log(`  Text: ${seg.text}...`);
		}

		console.log("\n=== サンプル: 段落番号が1より小さいセグメント ===");
		const lessThan1Samples = unlinkedSegments
			.filter((s) => s.hasParagraphNumberLessThan1)
			.slice(0, 10);
		for (const seg of lessThan1Samples) {
			console.log(
				`\n[${seg.fileKey}] ${seg.pageSlug} (segment #${seg.segmentNumber})`,
			);
			console.log(`  Paragraph numbers: ${seg.paragraphNumbers.join(", ")}`);
			console.log(`  Text: ${seg.text}...`);
		}

		// <dd>タグで囲まれているセグメントの段落番号抽出を確認
		console.log("\n=== <dd>タグで囲まれているセグメントの調査 ===");
		const ddSegments = await prisma.segment.findMany({
			where: {
				segmentTypeId: { in: commentaryTypeIds },
				text: { contains: "<dd>" },
			},
			select: {
				id: true,
				number: true,
				text: true,
				content: {
					select: {
						page: {
							select: {
								slug: true,
							},
						},
					},
				},
			},
			take: 10,
		});
		console.log(`<dd>タグを含むセグメント数: ${ddSegments.length}`);
		for (const seg of ddSegments) {
			const paraNums = extractParagraphNumbers(seg.text);
			const pageSlug = seg.content.page?.slug ?? "unknown";
			const fileKey =
				pageSlug !== "unknown" ? extractFileKeyFromSlug(pageSlug) : null;
			console.log(`\n[${fileKey}] ${pageSlug} (segment #${seg.number})`);
			console.log(
				`  段落番号: ${paraNums.length > 0 ? paraNums.join(", ") : "なし"}`,
			);
			console.log(
				`  テキスト（最初の200文字）: ${seg.text.substring(0, 200)}...`,
			);
		}

		// s0202m.mul.xmlの段落番号80を含むセグメントを確認
		console.log("\n=== s0202m.mul.xmlの段落番号80の調査 ===");
		const s0202Page = await prisma.page.findUnique({
			where: { slug: "tipitaka-s0202m-mul-xml" },
			include: {
				content: {
					include: {
						segments: {
							where: {
								OR: [
									{ text: { contains: "80\\." } },
									{ text: { contains: "80" } },
								],
							},
							select: {
								id: true,
								number: true,
								text: true,
							},
							orderBy: { number: "asc" },
						},
					},
				},
			},
		});
		if (s0202Page?.content?.segments) {
			console.log(
				`見つかったセグメント数: ${s0202Page.content.segments.length}`,
			);
			for (const seg of s0202Page.content.segments) {
				const paraNums = extractParagraphNumbers(seg.text);
				const has80 = paraNums.includes(80);
				const hasDD = seg.text.includes("<dd>");
				console.log(
					`\nSegment #${seg.number}: 段落番号80を含む: ${has80}, <dd>を含む: ${hasDD}`,
				);
				if (has80) {
					console.log(`  段落番号: ${paraNums.join(", ")}`);
					const idx = seg.text.indexOf("80");
					console.log(
						`  テキスト: ${seg.text.substring(Math.max(0, idx - 30), idx + 100)}`,
					);
				} else if (hasDD) {
					console.log(
						`  テキスト（最初の200文字）: ${seg.text.substring(0, 200)}...`,
					);
				}
			}
		}

		console.log(
			"\n=== サンプル: 段落番号が1以上でもリンクされていないセグメント（Sutta経典から） ===",
		);

		// books.jsonからsutta（sで始まるfileKey）の注釈書エントリを取得
		const suttaCommentaryEntries = entries
			.filter(
				(e) =>
					(e.level === "Atthakatha" || e.level === "Tika") &&
					e.fileKey.toLowerCase().startsWith("s") &&
					e.mulaFileKey, // mulaFileKeyが設定されているもののみ
			)
			.slice(0, 10); // 最初の10件を調査

		console.log(
			`調査対象のSutta注釈書エントリ数: ${suttaCommentaryEntries.length}`,
		);

		// MULAタイプのセグメントを取得
		const mulaType = await prisma.segmentType.findUnique({
			where: { key: "MULA" },
		});

		if (!mulaType) {
			console.log("❌ MULAセグメントタイプが見つかりません");
		} else {
			// suttaの注釈書から具体例を抽出
			const examples: Array<{
				commentaryFileKey: string;
				mulaFileKey: string;
				segmentNumber: number;
				paragraphNumbers: number[];
				text: string;
				existsInMula: boolean[];
				mulaParagraphCount: number;
			}> = [];

			for (const entry of suttaCommentaryEntries) {
				if (!entry.mulaFileKey) continue;

				// 注釈書のページを取得
				const commentarySlug = `tipitaka-${entry.fileKey
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "")}`;
				const commentaryPage = await prisma.page.findUnique({
					where: { slug: commentarySlug },
					include: {
						content: {
							include: {
								segments: {
									where: {
										segmentTypeId: { in: commentaryTypeIds },
										linksFrom: { none: {} }, // リンクされていないもののみ
									},
									select: {
										id: true,
										number: true,
										text: true,
									},
									orderBy: { number: "asc" },
								},
							},
						},
					},
				});

				if (!commentaryPage) continue;

				// 根本経典のページを取得
				const mulaSlug = `tipitaka-${entry.mulaFileKey
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "")}`;
				const mulaPage = await prisma.page.findUnique({
					where: { slug: mulaSlug },
					include: {
						content: {
							include: {
								segments: {
									select: {
										id: true,
										number: true,
										text: true,
										segmentTypeId: true,
									},
									orderBy: { number: "asc" },
								},
							},
						},
					},
				});

				if (!mulaPage) continue;

				// MULAタイプのセグメントのみをフィルタ
				const mulaSegments = mulaPage.content.segments.filter(
					(seg) => seg.segmentTypeId === mulaType.id,
				);

				// 根本経典の段落番号マップを構築
				const mulaParagraphMap = new Map<number, number[]>();
				for (const seg of mulaSegments) {
					PARAGRAPH_NUMBER_REGEX.lastIndex = 0;
					let match: RegExpExecArray | null = PARAGRAPH_NUMBER_REGEX.exec(
						seg.text,
					);
					while (match !== null) {
						const paraNum = Number.parseInt(match[1] ?? "", 10);
						if (Number.isFinite(paraNum)) {
							const ids = mulaParagraphMap.get(paraNum) ?? [];
							ids.push(seg.id);
							mulaParagraphMap.set(paraNum, ids);
						}
						match = PARAGRAPH_NUMBER_REGEX.exec(seg.text);
					}
				}

				// 段落番号が1以上でもリンクされていないセグメントを抽出
				// まず、根本経典に存在するのにリンクされていないものを優先的に取得
				const allSegments = await prisma.segment.findMany({
					where: {
						contentId: commentaryPage.content.id,
						segmentTypeId: { in: commentaryTypeIds },
						linksFrom: { none: {} }, // リンクされていないもののみ
					},
					select: {
						id: true,
						number: true,
						text: true,
					},
					orderBy: { number: "asc" },
				});

				for (const seg of allSegments) {
					const paraNums = extractParagraphNumbers(seg.text);
					if (
						paraNums.length > 0 &&
						paraNums.every((n) => n >= 1) &&
						examples.length < 30 // 最大30件まで
					) {
						const existsInMula = paraNums.map((n) => mulaParagraphMap.has(n));
						const allExist = existsInMula.every((e) => e);

						// 根本経典に存在するのにリンクされていないものを優先
						if (allExist || examples.length < 15) {
							examples.push({
								commentaryFileKey: entry.fileKey,
								mulaFileKey: entry.mulaFileKey,
								segmentNumber: seg.number,
								paragraphNumbers: paraNums,
								text: seg.text.substring(0, 150),
								existsInMula,
								mulaParagraphCount: mulaParagraphMap.size,
							});
						}
					}
				}
			}

			// 具体例を分類
			const examplesWithAllExist = examples.filter((e) =>
				e.existsInMula.every((x) => x),
			);
			const examplesWithSomeExist = examples.filter(
				(e) => e.existsInMula.some((x) => x) && !e.existsInMula.every((x) => x),
			);
			const examplesWithNoneExist = examples.filter(
				(e) => !e.existsInMula.some((x) => x),
			);

			console.log(`\n見つかった具体例: ${examples.length}件`);
			console.log(
				`  - すべての段落番号が根本経典に存在するのにリンクされていない: ${examplesWithAllExist.length}件`,
			);
			console.log(
				`  - 一部の段落番号が根本経典に存在する: ${examplesWithSomeExist.length}件`,
			);
			console.log(
				`  - すべての段落番号が根本経典に存在しない: ${examplesWithNoneExist.length}件`,
			);

			if (
				examplesWithAllExist.length === 0 &&
				examplesWithSomeExist.length === 0
			) {
				console.log(
					`\n✅ 調査結果: 根本経典に存在する段落番号を持つセグメントはすべてリンクされています。`,
				);
				console.log(
					`\n⚠️ 問題: 「段落番号が1以上（でもリンクされていない）」の${stats.paragraphNumber1OrMore.toLocaleString()}件は、`,
				);
				console.log(`根本経典に存在しない段落番号を持つセグメントです。`);
				console.log(
					`これは、根本経典のマークダウンファイル内で段落番号が正しく抽出されていない可能性があります。`,
				);
				console.log(
					`\n詳細な調査が必要です: どの経典にどの段落番号が欠落しているかを確認してください。`,
				);
				console.log(
					`調査スクリプト: scripts/tipitaka-import/investigate-missing-paragraph-numbers.ts`,
				);
			}

			// 根本経典に存在するのにリンクされていない例を優先的に表示
			if (examplesWithAllExist.length > 0) {
				console.log(
					`\n=== ケース1: すべての段落番号が根本経典に存在するのにリンクされていない ===`,
				);
				for (const example of examplesWithAllExist.slice(0, 10)) {
					console.log(
						`\n[${example.commentaryFileKey}] → [${example.mulaFileKey}] (Segment #${example.segmentNumber})`,
					);
					console.log(`  段落番号: ${example.paragraphNumbers.join(", ")}`);
					console.log(
						`  ✅ すべての段落番号が根本経典に存在します（根本経典の段落数: ${example.mulaParagraphCount}）`,
					);
					console.log(
						`  ⚠️  しかしリンクされていません（リンク処理の不具合の可能性）`,
					);
					console.log(`  テキスト: ${example.text}...`);
				}
			}

			// 根本経典に存在しない例も表示
			if (examplesWithNoneExist.length > 0) {
				console.log(
					`\n=== ケース2: 段落番号が根本経典に存在しない（段落番号が範囲外の可能性） ===`,
				);
				for (const example of examplesWithNoneExist.slice(0, 5)) {
					const missingNums = example.paragraphNumbers.filter(
						(_, i) => !example.existsInMula[i],
					);
					console.log(
						`\n[${example.commentaryFileKey}] → [${example.mulaFileKey}] (Segment #${example.segmentNumber})`,
					);
					console.log(`  段落番号: ${example.paragraphNumbers.join(", ")}`);
					console.log(
						`  ❌ すべての段落番号が根本経典に存在しません（存在しない: ${missingNums.join(", ")})`,
					);
					console.log(
						`  （根本経典の段落数: ${example.mulaParagraphCount}、最大段落番号: ${Math.max(...example.paragraphNumbers)}）`,
					);
					console.log(`  テキスト: ${example.text}...`);
				}
			}
		}

		// books.jsonから注釈書エントリを取得して調査（既存のコード）
		const commentaryEntries = entries
			.filter((e) => e.level === "Atthakatha" || e.level === "Tika")
			.slice(0, 5); // 最初の5件を調査

		console.log(`\n調査対象の注釈書エントリ数: ${commentaryEntries.length}`);

		// 根本経典の段落番号マップを構築（サンプル用）
		const primaryType = await prisma.segmentType.findUnique({
			where: { key: "PRIMARY" },
		});

		// books.jsonのエントリから直接調査
		for (const entry of commentaryEntries) {
			if (!entry.mulaFileKey) {
				console.log(`\n[${entry.fileKey}] mulaFileKeyが設定されていません`);
				continue;
			}

			console.log(`\n[${entry.fileKey}] → 根本経典: ${entry.mulaFileKey}`);

			// 注釈書のページを取得（slugify関数と同じ方法でslugを構築）
			const commentarySlug = `tipitaka-${entry.fileKey
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "")}`;
			const commentaryPage = await prisma.page.findUnique({
				where: { slug: commentarySlug },
				include: {
					content: {
						include: {
							segments: {
								where: {
									segmentTypeId: { in: commentaryTypeIds },
									linksFrom: { none: {} }, // リンクされていないもののみ
								},
								select: {
									id: true,
									number: true,
									text: true,
								},
								orderBy: { number: "asc" },
								take: 20, // 最初の20セグメント
							},
						},
					},
				},
			});

			if (!commentaryPage) {
				console.log(`  ❌ 注釈書のページが見つかりません: ${commentarySlug}`);
				continue;
			}

			// 根本経典のページを取得（slugify関数と同じ方法でslugを構築）
			const mulaSlug = `tipitaka-${entry.mulaFileKey
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "")}`;
			console.log(`  根本経典のslug: ${mulaSlug}`);
			const mulaPage = await prisma.page.findUnique({
				where: { slug: mulaSlug },
				include: {
					content: {
						include: {
							segments: {
								// segmentTypeIdのフィルタを外してすべてのセグメントを取得
								select: {
									id: true,
									number: true,
									text: true,
									segmentTypeId: true,
								},
								orderBy: { number: "asc" },
								// すべてのセグメントを取得
							},
						},
					},
				},
			});

			if (!mulaPage) {
				console.log(`  ❌ 根本経典のページが見つかりません: ${mulaSlug}`);
				continue;
			}

			if (!primaryType) {
				console.log(`  ❌ PRIMARYセグメントタイプが見つかりません`);
				continue;
			}

			// MULAタイプのセグメントを取得（PRIMARYではなくMULA）
			const mulaType = await prisma.segmentType.findUnique({
				where: { key: "MULA" },
			});

			if (!mulaType) {
				console.log(`  ❌ MULAセグメントタイプが見つかりません`);
				continue;
			}

			// MULAタイプのセグメントのみをフィルタ
			const mulaSegments = mulaPage.content.segments.filter(
				(seg) => seg.segmentTypeId === mulaType.id,
			);

			console.log(
				`  根本経典の全セグメント数: ${mulaPage.content.segments.length}`,
			);
			console.log(`  根本経典のMULAセグメント数: ${mulaSegments.length}`);

			// セグメントタイプIDの分布を確認
			const segmentTypeIds = new Map<number, number>();
			for (const seg of mulaPage.content.segments) {
				segmentTypeIds.set(
					seg.segmentTypeId,
					(segmentTypeIds.get(seg.segmentTypeId) ?? 0) + 1,
				);
			}
			console.log(
				`  セグメントタイプIDの分布: ${Array.from(segmentTypeIds.entries())
					.map(([id, count]) => `${id}:${count}`)
					.join(", ")}`,
			);
			console.log(`  MULAタイプID: ${mulaType.id}`);

			// 根本経典の段落番号マップを構築（run.tsと同じ方法）
			const mulaParagraphMap = new Map<number, number[]>();
			for (const seg of mulaSegments) {
				PARAGRAPH_NUMBER_REGEX.lastIndex = 0;
				let match: RegExpExecArray | null = PARAGRAPH_NUMBER_REGEX.exec(
					seg.text,
				);
				while (match !== null) {
					const paraNum = Number.parseInt(match[1] ?? "", 10);
					if (Number.isFinite(paraNum)) {
						const ids = mulaParagraphMap.get(paraNum) ?? [];
						ids.push(seg.id);
						mulaParagraphMap.set(paraNum, ids);
					}
					match = PARAGRAPH_NUMBER_REGEX.exec(seg.text);
				}
			}

			console.log(
				`  根本経典の段落番号マップ: ${Array.from(mulaParagraphMap.keys())
					.sort((a, b) => a - b)
					.slice(0, 20)
					.join(", ")} (合計${mulaParagraphMap.size}個の段落番号)`,
			);

			// 特定の段落番号が存在するか確認（デバッグ用）
			const testParagraphNumbers = [76, 77, 79, 80, 81];
			for (const testNum of testParagraphNumbers) {
				if (mulaParagraphMap.has(testNum)) {
					console.log(`  ✅ 段落番号${testNum}は根本経典に存在します`);
				} else {
					console.log(`  ❌ 段落番号${testNum}は根本経典に存在しません`);
					// 該当するセグメントを探す（正規表現ベースで正確に検出）
					const segmentsWithNumber = mulaSegments.filter((seg) => {
						const paraNums = extractParagraphNumbers(seg.text);
						return paraNums.includes(testNum);
					});
					if (segmentsWithNumber.length > 0) {
						console.log(
							`    しかし、段落番号${testNum}を含むセグメントが${segmentsWithNumber.length}件見つかりました`,
						);
						for (const seg of segmentsWithNumber.slice(0, 2)) {
							const paraNums = extractParagraphNumbers(seg.text);
							console.log(
								`      Segment #${seg.number}: 段落番号 [${paraNums.join(", ")}]`,
							);
							console.log(`      テキスト: ${seg.text.substring(0, 100)}...`);
						}
					}
				}
			}

			// 注釈書のすべてのセグメントを取得（リンク状況も確認）
			const allCommentarySegments = await prisma.segment.findMany({
				where: {
					contentId: commentaryPage.content.id,
					segmentTypeId: { in: commentaryTypeIds },
				},
				include: {
					linksFrom: {
						select: { id: true },
					},
				},
				orderBy: { number: "asc" },
			});

			// 段落番号が1以上でもリンクされていないセグメントを調査
			const unlinkedWithParagraphNumber = allCommentarySegments.filter(
				(seg) => {
					const paraNums = extractParagraphNumbers(seg.text);
					return (
						paraNums.length > 0 &&
						paraNums.every((n) => n >= 1) &&
						seg.linksFrom.length === 0 && // リンクされていない
						paraNums.every((n) => mulaParagraphMap.has(n)) // 根本経典に存在する
					);
				},
			);

			if (unlinkedWithParagraphNumber.length > 0) {
				console.log(
					`  ⚠️ 段落番号が1以上で根本経典に存在するのにリンクされていないセグメント: ${unlinkedWithParagraphNumber.length}件`,
				);
				for (const seg of unlinkedWithParagraphNumber.slice(0, 10)) {
					const paraNums = extractParagraphNumbers(seg.text);
					console.log(
						`    Segment #${seg.number}: Paragraph numbers: ${paraNums.join(", ")}`,
					);
					console.log(`      Text: ${seg.text.substring(0, 80)}...`);

					// なぜリンクされていないか確認
					// run.tsのlinkSegmentsByParagraphNumberと同じロジックで確認
					const shouldBeLinked = paraNums.some((n) => mulaParagraphMap.has(n));
					if (shouldBeLinked) {
						console.log(`      → リンクされるべきなのにリンクされていません`);
					}
				}
			}

			// 根本経典に存在しない段落番号を持つセグメント
			const missingParagraphNumbers = allCommentarySegments
				.filter((seg) => {
					const paraNums = extractParagraphNumbers(seg.text);
					return (
						paraNums.length > 0 &&
						paraNums.every((n) => n >= 1) &&
						paraNums.some((n) => !mulaParagraphMap.has(n))
					);
				})
				.slice(0, 5);

			if (missingParagraphNumbers.length > 0) {
				console.log(
					`  段落番号が1以上でも根本経典に存在しないセグメント: ${missingParagraphNumbers.length}件`,
				);
				for (const seg of missingParagraphNumbers) {
					const paraNums = extractParagraphNumbers(seg.text);
					const missing = paraNums.filter((n) => !mulaParagraphMap.has(n));
					console.log(
						`    Segment #${seg.number}: Paragraph numbers: ${paraNums.join(", ")}`,
					);
					console.log(
						`      根本経典に存在しない段落番号: ${missing.join(", ")}`,
					);
					console.log(`      Text: ${seg.text.substring(0, 80)}...`);
				}
			} else if (unlinkedWithParagraphNumber.length === 0) {
				console.log(
					`  ✅ すべての段落番号が根本経典に存在し、リンクもされています`,
				);
			}
		}

		// 根本経典の最初のセグメントを確認（実際のコンテンツページ、.mulで終わるfileKey）
		console.log("\n=== 根本経典の最初のセグメント（サンプル） ===");
		if (primaryType) {
			// .mulで終わるfileKeyを持つページを探す
			const primaryPages = await prisma.page.findMany({
				where: {
					slug: { startsWith: "tipitaka-" },
					content: {
						segments: {
							some: {
								segmentTypeId: primaryType.id,
							},
						},
					},
				},
				include: {
					content: {
						include: {
							segments: {
								where: {
									segmentTypeId: primaryType.id,
									number: { lte: 10 },
								},
								orderBy: { number: "asc" },
								take: 10,
							},
						},
					},
				},
				take: 20,
			});

			// .mulで終わるfileKeyを持つページのみをフィルタ
			const mulaPages = primaryPages
				.filter((page) => {
					const fileKey = extractFileKeyFromSlug(page.slug);
					return fileKey && /\.mul$/i.test(fileKey);
				})
				.slice(0, 3);

			for (const page of mulaPages) {
				const fileKey = extractFileKeyFromSlug(page.slug) ?? "unknown";
				console.log(`\n[${fileKey}] ${page.slug}`);
				for (const seg of page.content.segments) {
					const paragraphNumbers = extractParagraphNumbers(seg.text);
					console.log(
						`  Segment #${seg.number}: Paragraph numbers: ${paragraphNumbers.join(", ") || "なし"}`,
					);
					console.log(`    Text: ${seg.text.substring(0, 80)}...`);
				}
			}
		}

		// リンクが実際に作成されているか確認
		console.log("\n=== リンクの統計 ===");
		const linkCount = await prisma.segmentLink.count();
		console.log(`総リンク数: ${linkCount}`);

		const linkedCommentarySegments = await prisma.segment.count({
			where: {
				segmentTypeId: { in: commentaryTypeIds },
				linksTo: { some: {} },
			},
		});
		console.log(
			`リンクされている注釈書セグメント数（linksTo）: ${linkedCommentarySegments}`,
		);

		const linkedCommentarySegmentsFrom = await prisma.segment.count({
			where: {
				segmentTypeId: { in: commentaryTypeIds },
				linksFrom: { some: {} },
			},
		});
		console.log(
			`リンクされている注釈書セグメント数（linksFrom）: ${linkedCommentarySegmentsFrom}`,
		);
	} finally {
		await prisma.$disconnect();
	}
}

investigateUnlinkedCommentary().catch(console.error);
