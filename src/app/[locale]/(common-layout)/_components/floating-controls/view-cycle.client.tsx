/* app/_components/view-cycle.tsx */
"use client";
import { FileText } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useEffect } from "react";
import { useView, type View } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";

const getNextView = (view: View): View =>
	view === "user" ? "source" : view === "source" ? "both" : "user";

interface Props {
	afterClick?: () => void;
	userLocale: string;
	sourceLocale: string;
}

export function ViewCycle({ afterClick, userLocale, sourceLocale }: Props) {
	const { view: currentView, setView } = useView();
	const [view, setQueryView] = useQueryState(
		"view",
		parseAsStringEnum<View>(["user", "source", "both"]).withOptions({
			shallow: true,
		}),
	);

	useEffect(() => {
		if (view) {
			setView(view);
			return;
		}
		setQueryView(currentView);
	}, [view, setView, setQueryView, currentView]);

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
		const current = view ?? currentView;
		const next = getNextView(current);
		setQueryView(next);
		setView(next);
		afterClick?.();
	};

	/* ボタン内部の表示内容 */
	const inner =
		currentView === "user" ? (
			<span>{userLocale.toUpperCase()}</span>
		) : currentView === "source" ? (
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
		currentView === "user"
			? "Currently: User language only (Click to change)"
			: currentView === "source"
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
