"use client";
import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Languages, Text } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { ShareDialog } from "./share-dialog";

interface FloatingControlsProps {
	liked: boolean;
	likeCount: number;
	slug: string;
	shareTitle: string;
	initialShowOriginal: boolean;
	initialShowTranslation: boolean;
}

export function FloatingControls({
	liked,
	likeCount,
	slug,
	shareTitle,
	initialShowOriginal,
	initialShowTranslation,
}: FloatingControlsProps) {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const shareUrl =
		typeof window !== "undefined"
			? `${window.location.origin}${pathname}${
					searchParams.toString() ? `?${searchParams.toString()}` : ""
				}`
			: "";

	const [showOriginal, setShowOriginal] = useQueryState("showOriginal", {
		parse: (value): boolean => value === "true",
		shallow: false,
	});

	const [showTranslation, setShowTranslation] = useQueryState(
		"showTranslation",
		{
			parse: (value): boolean => value === "true",
			shallow: false,
		},
	);
	const handleToggleOriginal = () => {
		setShowOriginal(!(showOriginal ?? initialShowOriginal));
	};

	const handleToggleTranslation = () => {
		setShowTranslation(!(showTranslation ?? initialShowTranslation));
	};

	const handleScroll = useCallback(() => {
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
					"drop-shadow-xl dark:drop-shadow-[0_20px_13px_rgba(255,255,255,0.08)] h-12 w-12 rounded-full border bg-background relative after:absolute after:w-full after:h-[1px] after:bg-current after:top-1/2 after:left-0 after:origin-center after:-rotate-45",
					(showOriginal ?? initialShowOriginal) && "after:opacity-50",
				)}
				onClick={handleToggleOriginal}
				title={
					(showOriginal ?? initialShowOriginal)
						? "Hide original text"
						: "Show original text"
				}
			>
				<Text
					className={cn(
						"h-5 w-5",
						(showOriginal ?? initialShowOriginal) && "opacity-50",
					)}
				/>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"drop-shadow-xl dark:drop-shadow-[0_20px_13px_rgba(255,255,255,0.08)] h-12 w-12 rounded-full border bg-background relative after:absolute after:w-full after:h-[1px] after:bg-current after:top-1/2 after:left-0 after:origin-center after:-rotate-45",
					(showTranslation ?? initialShowTranslation) && "after:opacity-50",
				)}
				onClick={handleToggleTranslation}
				title={
					(showTranslation ?? initialShowTranslation)
						? "Hide translation"
						: "Show translation"
				}
			>
				<Languages
					className={cn(
						"h-5 w-5",
						(showTranslation ?? initialShowTranslation) && "opacity-50",
					)}
				/>
			</Button>
			<div className="drop-shadow-xl  dark:drop-shadow-[0_20px_13px_rgba(255,255,255,0.08)]  h-12 w-12">
				<LikeButton liked={liked} likeCount={likeCount} slug={slug} />
			</div>
			<div className="drop-shadow-xl  dark:drop-shadow-[0_20px_13px_rgba(255,255,255,0.08)] h-12 w-12">
				<ShareDialog url={shareUrl} title={shareTitle} />
			</div>
		</div>
	);
}
