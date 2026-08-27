"use client";

import { Check, Copy, Share } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

function currentShareUrl() {
	return typeof window === "undefined" ? "" : window.location.href;
}

export function ShareDialog() {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const shareUrl = currentShareUrl();
	const shareTitle = typeof document === "undefined" ? "" : document.title;

	async function copyUrl() {
		if (!navigator.clipboard) return;
		await navigator.clipboard.writeText(shareUrl);
		setCopied(true);
	}

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button
					aria-label="Share"
					className="h-10 w-10 rounded-full bg-background"
					size="icon"
					variant="ghost"
				>
					<Share aria-hidden="true" className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="rounded-3xl p-6 sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-center">Share</DialogTitle>
				</DialogHeader>
				<div className="mt-4 flex flex-wrap justify-center gap-3">
					<Button
						aria-label="Copy link"
						onClick={() => void copyUrl()}
						size="icon"
						variant="outline"
					>
						{copied ? (
							<Check aria-hidden="true" className="h-4 w-4" />
						) : (
							<Copy aria-hidden="true" className="h-4 w-4" />
						)}
					</Button>
					<a
						aria-label="Share on X"
						className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold"
						href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
						rel="noreferrer"
						target="_blank"
					>
						X
					</a>
					<a
						aria-label="Share on Facebook"
						className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold"
						href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
						rel="noreferrer"
						target="_blank"
					>
						f
					</a>
				</div>
			</DialogContent>
		</Dialog>
	);
}
