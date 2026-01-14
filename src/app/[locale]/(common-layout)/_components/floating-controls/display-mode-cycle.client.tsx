/* app/_components/display-mode-cycle.tsx */
"use client";
import { FileText } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useEffect } from "react";
import { type DisplayMode, useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";

const getNextDisplayMode = (mode: DisplayMode): DisplayMode =>
	mode === "user" ? "source" : mode === "source" ? "both" : "user";

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
	const { mode: currentMode, setMode } = useDisplay();
	const [mode, setQueryMode] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>(["user", "source", "both"]).withOptions({
			shallow: true,
		}),
	);

	useEffect(() => {
		if (mode) {
			setMode(mode);
			return;
		}
		setQueryMode(currentMode);
	}, [mode, setMode, setQueryMode, currentMode]);

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
		const current = mode ?? currentMode;
		const next = getNextDisplayMode(current);
		setQueryMode(next);
		setMode(next);
		afterClick?.();
	};

	/* ボタン内部の表示内容 */
	const inner =
		currentMode === "user" ? (
			<span>{userLocale.toUpperCase()}</span>
		) : currentMode === "source" ? (
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
		currentMode === "user"
			? "Currently: User language only (Click to change)"
			: currentMode === "source"
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
