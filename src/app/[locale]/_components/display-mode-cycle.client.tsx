/* app/_components/display-mode-cycle.tsx */
"use client";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface Props {
	afterClick?: () => void;
}

export function DisplayModeCycle({ afterClick }: Props) {
	const { mode, cycle, userLocale, sourceLocale } = useDisplay(); // mode: "user" | "source" | "both"

	const handleClick = () => {
		afterClick?.();
		cycle(); // ③ 状態変更
	};

	/* ボタン内部の表示内容 */
	const inner =
		mode === "user" ? (
			<span>{userLocale.toUpperCase()}</span>
		) : mode === "source" ? (
			<FileText className="w-5 h-5" />
		) : (
			<span className="flex items-center gap-px scale-90">
				<span className="text-[10px] leading-none">
					{userLocale.toUpperCase()}
				</span>
				<span className="text-[10px] leading-none">/</span>
				<FileText className="w-3 h-3" />
			</span>
		);

	/* アクセシブルラベル */
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
			className="border h-10 w-10 rounded-full bg-background font-semibold text-xs"
		>
			{inner}
		</Button>
	);
}
