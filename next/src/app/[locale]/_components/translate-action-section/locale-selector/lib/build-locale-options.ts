import type { LocaleOption } from "@/app/_constants/locale";
/**
 * - `existLocales`   訳が存在する言語コード配列（例: ["en","zh"]）
 * - `supported`      { code, name } 一覧（定数で持つ 20 言語など）
 * - `sourceLocale?`  原文の言語コード（undefined なら追加しない）
 *
 * 戻り値:  重複を除いた { code, name }[]
 *          原文があれば 先頭 = 原文, 以降 = existLocales の順
 */
export function buildLocaleOptions({
	existLocales,
	supported,
	sourceLocale,
}: {
	existLocales: string[];
	supported: LocaleOption[];
	sourceLocale?: string;
}): LocaleOption[] {
	/** 与えられた言語コードを {code,name} に変換するヘルパ */
	const toOption = (code: string): LocaleOption => {
		const found = supported.find((s) => s.code === code);
		return { code, name: found?.name ?? code };
	};

	// 1) 原文オプション（存在すれば）
	const srcOpt = sourceLocale ? [toOption(sourceLocale)] : [];

	// 2) 翻訳済みオプション
	const existOpts = existLocales.map(toOption);

	// 3) 連結 → 重複除去
	const merged = [...srcOpt, ...existOpts];
	return merged.filter(
		(opt, idx, self) => self.findIndex((o) => o.code === opt.code) === idx,
	);
}
