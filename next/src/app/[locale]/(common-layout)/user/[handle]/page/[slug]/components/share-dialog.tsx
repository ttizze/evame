"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { CopyIcon, Share } from "lucide-react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
	FacebookIcon,
	FacebookShareButton,
	RedditIcon,
	RedditShareButton,
	TwitterShareButton,
} from "react-share";
import { toast } from "sonner";
import Image from "next/image";
interface ShareDialogProps {
	title: string;
}

export function ShareDialog({ title }: ShareDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { showOriginal, showTranslation } = Object.fromEntries(searchParams);
	// useParams で現在の locale と slug を取得
	const { locale, slug } = useParams();
	if (typeof locale !== "string" || typeof slug !== "string") {
		return null;
	}

	const getShareUrl = () => {
		if (typeof window !== "undefined") {
			let currentUrl = `${window.location.origin}${pathname}`;
			const params = [];

			if (showOriginal) params.push(`showOriginal=${showOriginal}`);
			if (showTranslation) params.push(`showTranslation=${showTranslation}`);

			if (params.length > 0) {
				currentUrl += `?${params.join("&")}`;
			}

			return currentUrl;
		}
		return "";
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-12 w-12 rounded-full border bg-background"
				>
					<Share className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md rounded-3xl p-6">
				<DialogHeader>
					<DialogTitle className="text-center">Share</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-6 mt-4">
					{/* シェア用ボタン群 */}
					<div className="flex justify-center space-x-4">
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
						<FacebookShareButton url={getShareUrl()}>
							<FacebookIcon size={32} round />
						</FacebookShareButton>
						<TwitterShareButton url={getShareUrl()} title={title}>
							<Image
								src="/x.svg"
								alt="X"
								width={32}
								height={32}
								className="dark:invert"
							/>
						</TwitterShareButton>
						<RedditShareButton url={getShareUrl()} title={title}>
							<RedditIcon size={32} round />
						</RedditShareButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
