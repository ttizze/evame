"use client";
import { Reply } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PageCommentForm } from "../../page-comment-form/client";
export function PageCommentReplyForm({
	pageId,
	parentId,
	userLocale,
}: {
	pageId: number;
	parentId: number;
	userLocale: string;
}) {
	const [isReplying, setIsReplying] = useState(false);
	const { data: session } = authClient.useSession();
	return (
		<>
			<Button
				aria-label="Reply"
				className="h-8 w-8 p-0"
				disabled={!session?.user}
				onClick={() => setIsReplying(!isReplying)}
				variant="ghost"
			>
				<Reply className="h-4 w-4" />
			</Button>
			{isReplying && (
				<PageCommentForm
					onReplySuccess={() => setIsReplying(false)}
					pageId={pageId}
					parentId={parentId}
					userLocale={userLocale}
				/>
			)}
		</>
	);
}
