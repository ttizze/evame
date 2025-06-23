import { FileText, FileX, Languages } from "lucide-react";
import type { LocaleStatus } from "./build-locale-options";

/**
 * 3-state アイコン
 * ───────────────────────────────────────────
 *  source       : 原文                     → FileText
 *  translated   : 既に翻訳がある           → Languages
 *  untranslated : サポート対象だが未翻訳   → FileX
 */
export function TypeIcon({ status }: { status: LocaleStatus }) {
	switch (status) {
		case "source":
			return <FileText data-testid="source-icon" className="w-4 h-4 mr-2" />;

		case "translated":
			return (
				<Languages data-testid="translated-icon" className="w-4 h-4 mr-2" />
			);

		/* 未翻訳: デフォルトで包むと将来ステータスが増えても安全 */
		default:
			return <FileX data-testid="untranslated-icon" className="w-4 h-4 mr-2" />;
	}
}
