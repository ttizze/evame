/* app/_components/display-mode-cycle.tsx */
"use client";
import { parseAsStringEnum, useQueryState } from "nuqs";
import type { DisplayMode } from "@/app/_context/display-provider";
import {
	getNextDisplayMode,
	useDisplay,
} from "@/app/_context/display-provider";
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
	const { mode, cycle } = useDisplay();
	const [, setQueryModeInUrl] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>(["user", "source", "both"])
			.withDefault("both")
			.withOptions({
				shallow: true,
				clearOnDefault: false,
			}),
	);

	const handleClick = () => {
		const next = getNextDisplayMode(mode);
		setQueryModeInUrl(next);
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
