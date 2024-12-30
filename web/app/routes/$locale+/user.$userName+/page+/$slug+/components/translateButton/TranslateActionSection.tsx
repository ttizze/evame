import type { UserAITranslationInfo } from "@prisma/client";
import { Languages } from "lucide-react";
import { useState } from "react";
// shadcn/uiのSelect
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { supportedLocales } from "~/constants/languages";
import { TranslateSettingsDialog } from "./TranslateSettingsDialog";

type TranslateActionSectionProps = {
	pageId: number;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	locale: string;
	otherLocales: string[];
};

export function TranslateActionSection({
	pageId,
	hasGeminiApiKey,
	userAITranslationInfo,
	locale,
	otherLocales,
}: TranslateActionSectionProps) {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	const existingOptions = otherLocales.map((lc) => {
		const localeName =
			supportedLocales.find((sl) => sl.code === lc)?.name || lc;
		return { code: lc, name: localeName };
	});

	// 現在のロケールの名前
	const currentLocaleName =
		supportedLocales.find((sl) => sl.code === locale)?.name || locale;

	// ▼「翻訳を追加する」をクリックした時の処理
	const handleCreateNewTranslation = () => {
		console.log("翻訳を追加する");
		setIsSettingsOpen(true);
	};

	const handleChange = (selectedCode: string) => {
		// 例: 選択された言語にページ遷移するなど
		// ここで navigate(`/...`) や window.location などを使って
		// 別の locale ページへ移動してもOK
		// console.log("Selected locale:", selectedCode);
	};

	return (
		<div className="pt-3">
			<div className="flex items-center gap-2">
				<Languages className="w-4 h-4" />
				<Select onValueChange={handleChange}>
					<SelectTrigger className="w-[200px] rounded-xl ">
						<SelectValue placeholder={currentLocaleName} />
					</SelectTrigger>
					<SelectContent>
						{existingOptions.map((item) => (
							<SelectItem key={item.code} value={item.code}>
								{item.name}
							</SelectItem>
						))}
						<div className="my-1 border-t border-gray-200 dark:border-neutral-600" />
						<SelectItem
							value="__addTranslation__"
							onClick={(e) => {
								e.stopPropagation();
								handleCreateNewTranslation();
							}}
						>
							翻訳を追加する
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* ▼ 翻訳設定ダイアログ ▼ */}
			<TranslateSettingsDialog
				open={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
				pageId={pageId}
				locale={locale}
				hasGeminiApiKey={hasGeminiApiKey}
				userAITranslationInfo={userAITranslationInfo}
			/>
		</div>
	);
}
