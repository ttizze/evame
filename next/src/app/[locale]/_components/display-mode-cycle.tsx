"use client";
import { useDisplay } from "@/app/[locale]/_lib/display-provider";
import { Button } from "@/components/ui/button";
import { FileText, Languages, SplitSquareHorizontal } from "lucide-react";

interface Props {
	afterClick?: () => void;
}

export function DisplayModeCycle({ afterClick }: Props) {
	const { mode, cycleMode } = useDisplay();

	const next =
		mode === "source-only"
			? "translation-only"
			: mode === "translation-only"
				? "bilingual"
				: "source-only";

	const icon =
		next === "translation-only" ? (
			<Languages className="w-5 h-5" />
		) : next === "bilingual" ? (
			<SplitSquareHorizontal className="w-5 h-5" />
		) : (
			<FileText className="w-5 h-5" />
		);

	const label =
		next === "translation-only"
			? "Show Translation"
			: next === "bilingual"
				? "Show Bilingual"
				: "Show Original";

	const handleClick = () => {
		cycleMode();
		afterClick?.(); // ← ここでスクロール無視を発火
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleClick}
			title={label}
			aria-label={label}
			className="h-12 w-12 rounded-full bg-background"
		>
			{icon}
		</Button>
	);
}
