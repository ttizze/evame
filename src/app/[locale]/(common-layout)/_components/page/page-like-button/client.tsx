"use client";

import { Heart, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getPageInteractionState,
	togglePageLike,
} from "@/app/[locale]/_db/page-interactions";
import { Button } from "@/components/ui/button";

type PageLikeButtonClientProps = {
	pageId: number;
	showCount?: boolean;
	className?: string;
	initialLikeCount: number;
	initialLiked?: boolean;
};

type LikeStateEvent = CustomEvent<{
	pageId: number;
	liked: boolean;
	likeCount: number;
}>;

function publishLikeState(pageId: number, liked: boolean, likeCount: number) {
	window.dispatchEvent(
		new CustomEvent("page-like-state", {
			detail: { pageId, liked, likeCount },
		}),
	);
}

export function PageLikeButtonClient({
	pageId,
	showCount = false,
	className,
	initialLikeCount,
	initialLiked = false,
}: PageLikeButtonClientProps) {
	const [liked, setLiked] = useState(initialLiked);
	const [likeCount, setLikeCount] = useState(initialLikeCount);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		let active = true;
		const handleLikeState = (event: Event) => {
			const detail = (event as LikeStateEvent).detail;
			if (detail?.pageId !== pageId) return;
			setLiked(detail.liked);
			setLikeCount(detail.likeCount);
		};
		window.addEventListener("page-like-state", handleLikeState);
		void getPageInteractionState({ data: { pageId } })
			.then((state) => {
				if (!active) return;
				setLiked(state.liked);
				setLikeCount(state.likeCount);
				publishLikeState(pageId, state.liked, state.likeCount);
			})
			.catch(() => undefined);
		return () => {
			active = false;
			window.removeEventListener("page-like-state", handleLikeState);
		};
	}, [pageId]);

	async function handleClick() {
		if (pending) return;
		setPending(true);
		try {
			const state = await togglePageLike({ data: { pageId } });
			setLiked(state.liked);
			setLikeCount(state.likeCount);
			publishLikeState(pageId, state.liked, state.likeCount);
		} catch {
			// 未認証や一時的な通信失敗では、サーバーの状態を表示したままにする。
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex items-center gap-2">
			<Button
				aria-label={liked ? "Unlike" : "Like"}
				className={`bg-background cursor-pointer ${className ?? ""}`}
				disabled={pending}
				onClick={handleClick}
				size="icon"
				type="button"
				variant="ghost"
			>
				{pending ? (
					<Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
				) : (
					<Heart
						aria-hidden="true"
						className={`h-5 w-5 rounded-full ${liked ? "text-red-500" : ""}`}
						fill={liked ? "currentColor" : "none"}
					/>
				)}
			</Button>
			{showCount ? (
				<span className="text-muted-foreground">{likeCount}</span>
			) : null}
		</div>
	);
}
