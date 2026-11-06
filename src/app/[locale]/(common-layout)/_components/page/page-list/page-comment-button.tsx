import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageCommentButtonProps = {
	commentCount: number;
	pageSlug: string;
	pageOwnerHandle: string;
	locale: string;
};

export function PageCommentButton({
	commentCount,
	pageSlug,
	pageOwnerHandle,
	locale,
}: PageCommentButtonProps) {
	return (
		<div className="flex items-center gap-2">
			<Button aria-label="Comments" asChild size="icon" variant="ghost">
				<a href={`/${locale}/${pageOwnerHandle}/${pageSlug}#comments`}>
					<MessageCircle className="h-5 w-5 rounded-full" />
				</a>
			</Button>
			<span className="text-muted-foreground">{commentCount}</span>
		</div>
	);
}
