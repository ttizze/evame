import { FileText, Languages } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { LikeButton } from "~/routes/resources+/like-button";
import { cn } from "~/utils/cn";
import { ShareDialog } from "./ShareDialog";

interface FloatingControlsProps {
	showOriginal: boolean;
	showTranslation: boolean;
	onToggleOriginal: () => void;
	onToggleTranslation: () => void;
	liked: boolean;
	likeCount: number;
	slug: string;
	shareUrl: string;
	shareTitle: string;
}

export function FloatingControls({
	showOriginal,
	showTranslation,
	onToggleOriginal,
	onToggleTranslation,
	liked,
	likeCount,
	slug,
	shareUrl,
	shareTitle,
}: FloatingControlsProps) {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

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
				"fixed bottom-4 right-4 flex gap-3 transition-all duration-300 transform",
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			<Button
				variant="secondary"
				size="icon"
				className="h-12 w-12 rounded-full shadow-lg"
				onClick={onToggleOriginal}
				title={showOriginal ? "Hide original text" : "Show original text"}
			>
				<FileText className={cn("h-5 w-5", !showOriginal && "opacity-50")} />
			</Button>
			<Button
				variant="secondary"
				size="icon"
				className="h-12 w-12 rounded-full shadow-lg"
				onClick={onToggleTranslation}
				title={showTranslation ? "Hide translation" : "Show translation"}
			>
				<Languages
					className={cn("h-5 w-5", !showTranslation && "opacity-50")}
				/>
			</Button>
			<div className="h-12 w-12">
				<LikeButton liked={liked} likeCount={likeCount} slug={slug} />
			</div>
			<div className="h-12 w-12">
				<ShareDialog url={shareUrl} title={shareTitle} />
			</div>
		</div>
	);
}
