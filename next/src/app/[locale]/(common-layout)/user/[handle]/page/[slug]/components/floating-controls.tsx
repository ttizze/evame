"use client";
import { LikeButton } from "@/app/[locale]/components/like-button/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Languages, List, Text } from "lucide-react"; // List アイコンをインポート
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
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);
	const [isTocOpen, setIsTocOpen] = useState(false);
	const ignoreScrollRef = useRef(false);

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
	// スタイル定義
	const STYLE = {
		baseClasses:
			"drop-shadow-xl dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)] h-12 w-12 rounded-full",
		toggledOffClasses: `bg-muted after:absolute after:w-full after:h-[1px] after:bg-current after:top-1/2 
		after:left-0 after:origin-center after:-rotate-45`,
		containerClasses:
			"fixed bottom-4 right-4 lg:right-8 xl:right-[15%] 2xl:right-[20%] transition-all duration-300 transform",
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
			setIsTocOpen(false);
		}

		// ページ最上部付近（ビューポートの3%以内）では常に表示
		if (currentScrollY < viewportHeight * 0.03) {
			setIsVisible(true);
		}

		setLastScrollY(currentScrollY);
	}, [lastScrollY]);

	const handleTocItemClick = useCallback(() => {
		// 一時的にスクロールイベントを無視して、
		// スクロールによる表示/非表示の切り替えが起きないようにする
		ignoreScrollRef.current = true;

		// コントロールを非表示にする
		setIsVisible(false);
		setIsTocOpen(false);
		// 少し遅延してからスクロールイベントの監視を再開
		setTimeout(() => {
			ignoreScrollRef.current = false;
		}, 500); // ユーザーがスクロール位置に到達するのに十分な時間
	}, []);

	useEffect(() => {
		window.addEventListener("scroll", handleShowFloatingControls, {
			passive: true,
		});
		return () => {
			window.removeEventListener("scroll", handleShowFloatingControls);
		};
	}, [handleShowFloatingControls]);

	// コントロールボタンのレンダリング
	const renderControlButtons = () => {
		const baseButtonClasses = `${STYLE.baseClasses} border relative bg-background`;

		return (
			<div className="flex gap-3 justify-end">
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

				{/* いいねボタン */}
				<div className={STYLE.baseClasses}>
					<LikeButton liked={liked} likeCount={likeCount} slug={slug} />
				</div>

				{/* シェアボタン */}
				<div className={STYLE.baseClasses}>
					<ShareDialog title={shareTitle} firstImageUrl={firstImageUrl} />
				</div>
			</div>
		);
	};
	const renderToc = () => {
		if (!isTocOpen) {
			return (
				<Button
					variant="ghost"
					size="icon"
					className={`${STYLE.baseClasses} border relative bg-background self-end`}
					onClick={() => setIsTocOpen(true)}
					title="Table of Contents"
				>
					<List className="h-5 w-5" />
				</Button>
			);
		}

		return (
			<div className={STYLE.tocContainerClasses}>
				<Toc onItemClick={handleTocItemClick} />
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
			<div className="flex flex-col gap-3">
				<div className="flex justify-end">
					{/* 右端に目次ボタンを配置 */}
					{renderToc()}
				</div>
				{renderControlButtons()}
			</div>
		</div>
	);
}
