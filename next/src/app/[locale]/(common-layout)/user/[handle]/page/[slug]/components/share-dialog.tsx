"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CheckCircle2, CopyIcon, Share, XIcon } from "lucide-react";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import {
	FacebookIcon,
	FacebookShareButton,
	RedditIcon,
	RedditShareButton,
	TwitterShareButton,
} from "react-share";
import { toast } from "sonner";

interface ShareDialogProps {
	title: string;
	firstImageUrl?: string;
}

export function ShareDialog({ title, firstImageUrl }: ShareDialogProps) {
	// 選択状態の OGP 種類 ("api" or "img")
	const [selectedOgp, setSelectedOgp] = useState<"api" | "img">("api");
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();

	// useParams で現在の locale と slug を取得
	const { locale, slug } = useParams();
	if (
		!locale ||
		typeof locale !== "string" ||
		!slug ||
		typeof slug !== "string"
	) {
		return null;
	}

	const baseUrl = process.env.NEXT_PUBLIC_DOMAIN ?? "http://localhost:3000";

	const apiOgpUrl = `${baseUrl}/api/og?locale=${encodeURIComponent(
		locale,
	)}&slug=${encodeURIComponent(slug)}`;

	const getShareUrl = () => {
		if (typeof window !== "undefined") {
			const currentUrl = `${window.location.origin}${pathname}`;
			return `${currentUrl}&ogp=${selectedOgp}`;
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
					{firstImageUrl && (
						<div className="flex gap-4 w-full justify-between">
							<div
								className={cn(
									"cursor-pointer border rounded-lg p-2 transition-all relative w-1/2",
									selectedOgp === "api"
										? "border-primary shadow-lg"
										: "border-muted hover:shadow-md",
								)}
								onClick={() => setSelectedOgp("api")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setSelectedOgp("api");
									}
								}}
							>
								<p className="text-sm mb-2 text-center">Generated</p>
								<div className="relative w-full aspect-[1.91/1]">
									<Image
										src={apiOgpUrl}
										alt="API OGP Preview"
										fill
										className="object-cover rounded"
									/>
								</div>
								{selectedOgp === "api" && (
									<div className="absolute top-2 right-2">
										<CheckCircle2 className="w-5 h-5 text-primary" />
									</div>
								)}
							</div>
							<div
								className={cn(
									"cursor-pointer border rounded-lg p-2 transition-all relative w-1/2",
									selectedOgp === "img"
										? "border-primary shadow-lg"
										: "border-muted hover:shadow-md",
								)}
								onClick={() => setSelectedOgp("img")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setSelectedOgp("img");
									}
								}}
							>
								<p className="text-sm mb-2 text-center">First Image</p>
								<div className="relative w-full aspect-[1.91/1]">
									<Image
										unoptimized
										src={firstImageUrl}
										alt="Image OGP Preview"
										fill
										className="object-cover rounded"
									/>
								</div>
								{selectedOgp === "img" && (
									<div className="absolute top-2 right-2">
										<CheckCircle2 className="w-5 h-5 text-primary" />
									</div>
								)}
							</div>
						</div>
					)}
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
							<XIcon size={32} />
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
