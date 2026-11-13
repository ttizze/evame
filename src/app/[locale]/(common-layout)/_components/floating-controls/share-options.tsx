import { CopyIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import {
	FacebookIcon,
	FacebookShareButton,
	RedditIcon,
	RedditShareButton,
	TwitterShareButton,
} from "react-share";
import { toast } from "sonner";
import { viewQueryState } from "@/app/[locale]/(common-layout)/_components/view-query";
import { Button } from "@/components/ui/button";

export default function ShareOptions() {
	const [view] = useQueryState("view", viewQueryState);
	const url = new URL(window.location.href);
	url.searchParams.set("view", view);
	const shareUrl = url.href;
	return (
		<div className="flex flex-col gap-6 mt-4">
			<div className="flex justify-center space-x-4">
				<Button
					className="rounded-full"
					onClick={() => {
						navigator.clipboard.writeText(shareUrl);
						toast.success("Copied to clipboard");
					}}
					size="icon"
					variant="outline"
				>
					<CopyIcon className="w-4 h-4" />
				</Button>
				<FacebookShareButton url={shareUrl}>
					<FacebookIcon round size={32} />
				</FacebookShareButton>
				<TwitterShareButton title={document.title} url={shareUrl}>
					<img
						alt="X"
						className="dark:invert"
						height={32}
						src="/x.svg"
						width={32}
					/>
				</TwitterShareButton>
				<RedditShareButton title={document.title} url={shareUrl}>
					<RedditIcon round size={32} />
				</RedditShareButton>
			</div>
		</div>
	);
}
