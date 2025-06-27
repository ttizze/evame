"use client";

import { CopyIcon, Share } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
	FacebookIcon,
	FacebookShareButton,
	RedditIcon,
	RedditShareButton,
	TwitterShareButton,
} from "react-share";
import { toast } from "sonner";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export function ShareDialog() {
	const [isOpen, setIsOpen] = useState(false);

	/* いま表示中のモードを取得 */
	const { mode } = useDisplay();

	const shareTitle = typeof window !== "undefined" ? document.title : "";

	/* 共有 URL を組み立て */
	const getShareUrl = () => {
		if (typeof window === "undefined") return "";
		const url = new URL(window.location.href);
		url.searchParams.set("displayMode", mode);
		return url.toString();
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-full border bg-background"
				>
					<Share className="h-5 w-5" />
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-md rounded-3xl p-6">
				<DialogHeader>
					<DialogTitle className="text-center">Share</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-6 mt-4">
					<div className="flex justify-center space-x-4">
						{/* コピー */}
						<Button
							variant="outline"
							size="icon"
							className="rounded-full"
							onClick={() => {
								navigator.clipboard.writeText(getShareUrl());
								toast.success("Copied to clipboard");
							}}
						>
							<CopyIcon className="w-4 h-4" />
						</Button>

						{/* SNS */}
						<FacebookShareButton url={getShareUrl()}>
							<FacebookIcon size={32} round />
						</FacebookShareButton>

						<TwitterShareButton url={getShareUrl()} title={shareTitle}>
							<Image
								src="/x.svg"
								alt="X"
								width={32}
								height={32}
								className="dark:invert"
							/>
						</TwitterShareButton>

						<RedditShareButton url={getShareUrl()} title={shareTitle}>
							<RedditIcon size={32} round />
						</RedditShareButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
