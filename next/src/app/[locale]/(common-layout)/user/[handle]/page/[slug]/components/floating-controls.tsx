"use client";
import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Languages, Text } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShareDialog } from "./share-dialog";
interface FloatingControlsProps {
	liked: boolean;
	likeCount: number;
	slug: string;
	shareTitle: string;
}

export function FloatingControls({
	liked,
	likeCount,
	slug,
	shareTitle,
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

	const pathname = usePathname();
	const searchParams = useSearchParams();
	const shareUrl =
		typeof window !== "undefined"
			? `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""
			}`
			: "";

	const handleScroll = useCallback(() => {
		if (ignoreScrollRef.current) return;

		const currentScrollY = window.scrollY;
		const scrollDelta = currentScrollY - lastScrollY;

		if (scrollDelta > 100) {
			setIsVisible(false);
		} else if (scrollDelta < 0 || currentScrollY < 100) {
			setIsVisible(true);
		}

		setLastScrollY(currentScrollY);
	}, [lastScrollY]);

	useEffect(() => {
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, [handleScroll]);

	const baseClasses =
		"drop-shadow-xl dark:shadow-[0_3px_3px_rgba(255,255,255,0.15)] h-12 w-12 rounded-full";
	const baseButtonClasses =
		`${baseClasses} border relative bg-background`;
	/** 非選択状態（トグルOFF）時の追加クラス */
	const toggledOffClasses =
		`bg-muted after:absolute after:w-full after:h-[1px] after:bg-current after:top-1/2 
		after:left-0 after:origin-center after:-rotate-45`;
	/** アイコンラッパーのクラス */

	return (
		<div
			className={cn(
				"fixed bottom-4 right-4 lg:right-8 xl:right-[15%] 2xl:right-[20%] flex gap-3 transition-all duration-300 transform",
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					baseButtonClasses,
					!showOriginal && toggledOffClasses,
				)}
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
				<ShareDialog url={shareUrl} title={shareTitle} />
			</div>
		</div>
	);
}
