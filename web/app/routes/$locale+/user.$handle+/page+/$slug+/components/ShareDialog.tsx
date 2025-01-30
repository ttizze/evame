import { Share } from "lucide-react";
import { CopyIcon } from "lucide-react";
import { useState } from "react";
import {
	FacebookIcon,
	FacebookShareButton,
	RedditIcon,
	RedditShareButton,
	TwitterShareButton,
	XIcon,
} from "react-share";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";

interface ShareDialogProps {
	url: string;
	title: string;
}

export function ShareDialog({ url, title }: ShareDialogProps) {
	const [isOpen, setIsOpen] = useState(false);

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
			<DialogContent className="sm:max-w-md rounded-3xl">
				<DialogHeader>
					<DialogTitle>Share</DialogTitle>
				</DialogHeader>
				<div className="flex justify-center space-x-4 mt-4">
					<Button variant="outline" size="icon" className="rounded-full">
						<CopyIcon
							className="w-4 h-4"
							onClick={() => {
								navigator.clipboard.writeText(url);
							}}
						/>
					</Button>
					<FacebookShareButton url={url}>
						<FacebookIcon size={32} round />
					</FacebookShareButton>
					<TwitterShareButton url={url} title={title}>
						<XIcon size={32} round />
					</TwitterShareButton>
					<RedditShareButton url={url} title={title}>
						<RedditIcon size={32} round />
					</RedditShareButton>
				</div>
			</DialogContent>
		</Dialog>
	);
}
