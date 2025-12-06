import type { TranslationProofStatus } from "@prisma/client";
import type { LocaleOption } from "@/app/_constants/locale";

export type LocaleStatus = "source" | "translated" | "untranslated";

/** UI 側で扱いやすいように、既存型を拡張 */
export interface LocaleOptionWithStatus extends LocaleOption {
	status: LocaleStatus;
	/** 翻訳済みの場合のみ付与される */
	proofStatus?: TranslationProofStatus;
}

/**
 * - `existLocales`: すでに翻訳が存在する言語コード配列（例: ["en","zh"]）
 * - `supported`   : アプリが対応している { code, name } 一覧（20 言語など）
 * - `sourceLocale`: 原文の言語コード（undefined なら「原文」行を出さない）
 *
 * 返り値: ソース → 翻訳済み → 未翻訳 の順に重複なしで並んだ配列
 */
export function buildLocaleOptions({
	existLocales,
	supported,
	sourceLocale,
	proofStatusMap = {},
}: {
	sourceLocale?: string;
	existLocales: string[];
	supported: LocaleOption[];
	/** locale => proofStatus の対応表 */
	proofStatusMap?: Record<string, TranslationProofStatus>;
}): LocaleOptionWithStatus[] {
	/* name 解決を O(1) にするため Map 化 */
	const nameMap = new Map(supported.map((o) => [o.code, o.name]));

	const toOption = (
		code: string,
		status: LocaleStatus,
		proofStatus?: TranslationProofStatus,
	): LocaleOptionWithStatus => {
		const base = {
			code,
			name: nameMap.get(code) ?? code, // 未登録言語でもフォールバック
			status,
		} as LocaleOptionWithStatus;

		if (proofStatus) {
			(base as LocaleOptionWithStatus).proofStatus = proofStatus;
		}

		return base;
	};

	const seen = new Set<string>();
	const result: LocaleOptionWithStatus[] = [];

	/* 1) 原文 */
	if (sourceLocale) {
		result.push(toOption(sourceLocale, "source"));
		seen.add(sourceLocale);
	}

	/* 2) 翻訳済み */
	for (const code of existLocales) {
		if (!seen.has(code)) {
			result.push(toOption(code, "translated", proofStatusMap[code]));
			seen.add(code);
		}
	}

	/* 3) 未翻訳（supported でまだ出ていないもの）*/
	for (const { code } of supported) {
		if (!seen.has(code)) {
			result.push(toOption(code, "untranslated"));
			// seen への追加は不要だが一貫性のため入れておく
			seen.add(code);
		}
	}

	return result;
}
