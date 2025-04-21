/* app/_components/display-mode-cycle.tsx */
"use client";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";
import { FileText, Rows2, UserRoundCheck } from "lucide-react";

interface Props {
	afterClick?: () => void;
}

export function DisplayModeCycle({ afterClick }: Props) {
	const { mode, cycle } = useDisplay(); // mode: "user" | "source" | "both"

	const handleClick = () => {
		afterClick?.();
		cycle(); // ③ 状態変更
	};
	/* 次に回るモードを計算 */
	const next = mode === "user" ? "source" : mode === "source" ? "both" : "user";

	/* アイコンをマッピング */
	const icon =
		next === "user" ? (
			<UserRoundCheck className="w-5 h-5" />
		) : next === "source" ? (
			<FileText className="w-5 h-5" />
		) : (
			<Rows2 className="w-5 h-5" />
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
			onClick={handleClick}
			title={label}
			aria-label={label}
			className="border h-10 w-10 rounded-full bg-background"
		>
			{icon}
		</Button>
	);
}
