"use client";
import { LikeButton } from "@/app/[locale]/components/like-button/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Languages, Text } from "lucide-react"; // List アイコンをインポート
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShareDialog } from "./share-dialog";
import Toc from "./toc";

interface FloatingControlsProps {
	liked: boolean;
	likeCount: number;
	slug: string;
	shareTitle: string;
	firstImageUrl: string | undefined;
}

export function FloatingControls({
	liked,
	likeCount,
	slug,
	shareTitle,
	firstImageUrl,
}: FloatingControlsProps) {
	const [showOriginal, setShowOriginal] = useQueryState("showOriginal", {
		defaultValue: true,
		parse: (val) => val === "true",
		serialize: (val) => (val ? "true" : "false"),
		shallow: true,
	});
	const [showTranslation, setShowTranslation] = useQueryState(
		"showTranslation",
		{
			defaultValue: true,
			parse: (val) => val === "true",
			serialize: (val) => (val ? "true" : "false"),
			shallow: true,
		},
	);
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);
	const ignoreScrollRef = useRef(false);

	const handleShowFloatingControls = useCallback(() => {
		if (ignoreScrollRef.current) return;

		const currentScrollY = window.scrollY;
		const viewportHeight = window.innerHeight;

		// スクロール量をビューポートの高さに対する割合で計算
		const scrollDelta = currentScrollY - lastScrollY;

		// スクロール方向を検出
		if (scrollDelta > 0) {
			// 下方向へのスクロール - コントロールを非表示
			setIsVisible(false);
		} else {
			// 上方向へのスクロール - コントロールを表示
			setIsVisible(true);
		}

		// ページ最上部付近（ビューポートの3%以内）では常に表示
		if (currentScrollY < viewportHeight * 0.03) {
			setIsVisible(true);
		}

		setLastScrollY(currentScrollY);
	}, [lastScrollY]);

	useEffect(() => {
		window.addEventListener("scroll", handleShowFloatingControls, {
			passive: true,
		});
		return () => {
			window.removeEventListener("scroll", handleShowFloatingControls);
		};
	}, [handleShowFloatingControls]);

	const baseClasses =
		"drop-shadow-xl dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)] h-12 w-12 rounded-full";
	const baseButtonClasses = `${baseClasses} border relative bg-background`;
	/** 非選択状態（トグルOFF）時の追加クラス */
	const toggledOffClasses = `bg-muted after:absolute after:w-full after:h-[1px] after:bg-current after:top-1/2 
		after:left-0 after:origin-center after:-rotate-45`;

	return (
		<div
			className={cn(
				"fixed bottom-4 right-4 lg:right-8 xl:right-[15%] 2xl:right-[20%] transition-all duration-300 transform",
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			<div className=" bg-background mb-3 p-4 rounded-xl drop-shadow-xl dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)] border border-border">
				<Toc />
			</div>
			<div className="flex gap-3">
				<Button
					variant="ghost"
					size="icon"
					className={cn(baseButtonClasses, !showOriginal && toggledOffClasses)}
					onClick={() => {
						setShowOriginal(!showOriginal);
						ignoreScrollRef.current = true;
						setTimeout(() => {
							ignoreScrollRef.current = false;
						}, 100);
					}}
					title={showOriginal ? "Hide original text" : "Show original text"}
				>
					<Text
						className={cn("h-5 w-5 opacity-100", !showOriginal && "opacity-50")}
					/>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						baseButtonClasses,
						!showTranslation && toggledOffClasses,
					)}
					onClick={() => {
						setShowTranslation(!showTranslation);
						ignoreScrollRef.current = true;
						setTimeout(() => {
							ignoreScrollRef.current = false;
						}, 100);
					}}
					title={showTranslation ? "Hide translation" : "Show translation"}
				>
					<Languages
						className={cn(
							"h-5 w-5 opacity-100",
							!showTranslation && "opacity-50",
						)}
					/>
				</Button>

				<div className={baseClasses}>
					<LikeButton liked={liked} likeCount={likeCount} slug={slug} />
				</div>
				<div className={baseClasses}>
					<ShareDialog title={shareTitle} firstImageUrl={firstImageUrl} />
				</div>
			</div>
		</div>
	);
}
