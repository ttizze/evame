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
	/* 現在のモードに対応するアイコンをマッピング */
	const icon =
		mode === "user" ? (
			<UserRoundCheck className="w-5 h-5" />
		) : mode === "source" ? (
			<FileText className="w-5 h-5" />
		) : (
			<Rows2 className="w-5 h-5" />
		);

	/* 現在のモードに対応するアクセシブルラベル */
	const label =
		mode === "user"
			? "Currently: User language only (Click to change)"
			: mode === "source"
				? "Currently: Source only (Click to change)"
				: "Currently: Both languages (Click to change)";

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
