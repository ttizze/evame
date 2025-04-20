"use client";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";
import { FileText, Languages, SplitSquareHorizontal } from "lucide-react";

interface Props {
	afterClick?: () => void;
}
export function DisplayModeCycle({ afterClick }: Props) {
	const { mode, cycle } = useDisplay();

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

	const handleClick = () => {
		cycle();
		afterClick?.(); // ← ここでスクロール無視を発火
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleClick}
			title={`next: ${next}`}
			className="border h-12 w-12 rounded-full bg-background hover:bg-gray-100 dark:hover:bg-gray-800"
		>
			{icon}
		</Button>
	);
}
