/* app/_components/display-mode-cycle.tsx */
"use client";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";
import { FileText, Languages, SplitSquareHorizontal } from "lucide-react";

export function DisplayModeCycle() {
	const { mode, cycle } = useDisplay(); // mode: "user" | "source" | "both"

	/* 次に回るモードを計算 */
	const next = mode === "user" ? "source" : mode === "source" ? "both" : "user";

	/* アイコンをマッピング */
	const icon =
		next === "user" ? (
			<Languages className="w-5 h-5" />
		) : next === "source" ? (
			<FileText className="w-5 h-5" />
		) : (
			<SplitSquareHorizontal className="w-5 h-5" />
		);

	/* アクセシブルラベル */
	const label =
		next === "user"
			? "Show user language only"
			: next === "source"
				? "Show source only"
				: "Show both";

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={cycle}
			title={label}
			aria-label={label}
			className="h-12 w-12 rounded-full bg-background"
		>
			{icon}
		</Button>
	);
}
