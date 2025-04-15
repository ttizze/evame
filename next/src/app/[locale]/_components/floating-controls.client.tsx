"use client";
import { useContentDisplayState } from "@/app/[locale]/_hooks/use-content-display-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Languages, Text } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShareDialog } from "../(common-layout)/user/[handle]/page/[slug]/_components/share-dialog";
interface FloatingControlsProps {
	shareTitle: string;
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
}

export function FloatingControls({
	likeButton,
	shareTitle,
	position = `fixed bottom-4 right-4 md:right-auto md:left-1/2 
			md:-translate-x-1/2 max-w-prose w-full px-4 md:px-0 
			duration-300 `,
	alwaysVisible = false,
}: FloatingControlsProps) {
	const [isVisible, setIsVisible] = useState(alwaysVisible);
	const [lastScrollY, setLastScrollY] = useState(0);
	const ignoreScrollRef = useRef(false);

	const { showOriginal, showTranslation, setShowOriginal, setShowTranslation } =
		useContentDisplayState();
	// スタイル定義
	const STYLE = {
		baseClasses: "h-12 w-12 rounded-full",
		toggledOffClasses: `bg-muted after:absolute after:w-full after:h-[1px] after:bg-current after:top-1/2 
		after:left-0 after:origin-center after:-rotate-45`,
		containerClasses: `${position} z-999 w-64 border rounded-full p-2 bg-gray-50 dark:bg-gray-900 shadow-lg dark:shadow-gray-900`,
		tocContainerClasses:
			"bg-background mb-3 p-4 rounded-xl drop-shadow-xl dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)] border border-border animate-in zoom-in-95 duration-200",
	};

	const temporarilyIgnoreScroll = (duration = 100) => {
		ignoreScrollRef.current = true;
		setTimeout(() => {
			ignoreScrollRef.current = false;
		}, duration);
	};
	const handleShowFloatingControls = useCallback(() => {
		// alwaysVisibleが有効な場合は常に表示
		if (alwaysVisible) {
			setIsVisible(true);
			return;
		}

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
	}, [lastScrollY, alwaysVisible]);

	useEffect(() => {
		// alwaysVisibleが有効な場合はスクロールイベントを登録しない
		if (!alwaysVisible) {
			window.addEventListener("scroll", handleShowFloatingControls, {
				passive: true,
			});
			return () => {
				window.removeEventListener("scroll", handleShowFloatingControls);
			};
		}
	}, [handleShowFloatingControls, alwaysVisible]);

	// コントロールボタンのレンダリング
	const renderControlButtons = () => {
		const baseButtonClasses = `${STYLE.baseClasses} border relative bg-background`;

		return (
			<div className="flex gap-3 justify-center">
				{/* 原文表示切替ボタン */}
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						baseButtonClasses,
						!showOriginal && STYLE.toggledOffClasses,
					)}
					onClick={() => {
						setShowOriginal(!showOriginal);
						temporarilyIgnoreScroll();
					}}
					title={showOriginal ? "Hide original text" : "Show original text"}
				>
					<Text
						className={cn("h-5 w-5 opacity-100", !showOriginal && "opacity-50")}
					/>
				</Button>

				{/* 翻訳表示切替ボタン */}
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						baseButtonClasses,
						!showTranslation && STYLE.toggledOffClasses,
					)}
					onClick={() => {
						setShowTranslation(!showTranslation);
						temporarilyIgnoreScroll();
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

				{likeButton && ( // likeButton が渡された場合のみ表示
					<div className={STYLE.baseClasses}>
						{likeButton} {/* 渡された likeButton をレンダリング */}
					</div>
				)}

				{/* シェアボタン */}
				<div className={STYLE.baseClasses}>
					<ShareDialog title={shareTitle} />
				</div>
			</div>
		);
	};

	return (
		<div
			className={cn(
				STYLE.containerClasses,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{renderControlButtons()}
		</div>
	);
}
