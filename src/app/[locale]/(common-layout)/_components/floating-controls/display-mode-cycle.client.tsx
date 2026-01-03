/* app/_components/display-mode-cycle.tsx */
"use client";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";

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
			<span>{sourceLocale.toUpperCase()}</span>
		) : (
			<span className="flex items-center gap-1 scale-90">
				<span className="text-[10px] leading-none">
					{userLocale.toUpperCase()}
				</span>
				<span className="text-[10px] leading-none">/</span>
				<span className="text-[10px] leading-none">
					{sourceLocale.toUpperCase()}
				</span>
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
			aria-label={label}
			className="border h-10  px-3 rounded-full bg-background font-semibold text-xs"
			onClick={handleClick}
			title={label}
			variant="ghost"
		>
			{inner}
		</Button>
	);
}
