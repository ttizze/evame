/* app/_components/display-mode-cycle.tsx */
"use client";
import { FileText } from "lucide-react";
import { useQueryState } from "nuqs";
import {
	getDisplayModeQueryState,
	getNextDisplayMode,
} from "@/app/[locale]/(common-layout)/_utils/display-mode";
import { Button } from "@/components/ui/button";

interface Props {
	afterClick?: () => void;
	userLocale: string;
	sourceLocale: string;
}

export function DisplayModeCycle({
	afterClick,
	userLocale,
	sourceLocale,
}: Props) {
	const [mode, setMode] = useQueryState(
		"displayMode",
		getDisplayModeQueryState().withDefault("both"),
	);

	const sourceLabel =
		sourceLocale === "mixed" ? (
			<FileText
				aria-hidden
				className="h-5 w-5"
				data-testid="source-mixed-icon"
			/>
		) : (
			<span>{sourceLocale.toUpperCase()}</span>
		);

	const handleClick = () => {
		const next = getNextDisplayMode(mode);
		setMode(next);
		afterClick?.();
	};

	/* ボタン内部の表示内容 */
	const inner =
		mode === "user" ? (
			<span>{userLocale.toUpperCase()}</span>
		) : mode === "source" ? (
			sourceLabel
		) : (
			<span className="flex items-center gap-1 scale-90">
				<span className="text-[10px] leading-none">
					{userLocale.toUpperCase()}
				</span>
				<span className="text-[10px] leading-none">/</span>
				<span className="text-[10px] leading-none">{sourceLabel}</span>
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
			className="h-10 px-3 rounded-full bg-background font-semibold text-xs cursor-pointer hover:scale-100 active:scale-100"
			onClick={handleClick}
			title={label}
			variant="ghost"
		>
			{inner}
		</Button>
	);
}
