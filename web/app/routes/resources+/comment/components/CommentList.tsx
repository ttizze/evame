import { useFetcher } from "@remix-run/react";
import { MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { CommentWithUser } from "~/routes/$locale+/user.$userName+/page+/$slug+/functions/queries.server";
interface CommentListProps {
	commentsWithUser: CommentWithUser;
	currentUserId?: number;
}

export function CommentList({
	commentsWithUser,
	currentUserId,
}: CommentListProps) {
	const fetcher = useFetcher();

	return (
		<div className="space-y-4">
			{commentsWithUser.map((comment) => (
				<div key={comment.id} className="p-2 bg-card rounded-xl">
					<div className="flex items-center">
						<Avatar className="w-6 h-6 mr-3">
							<AvatarImage
								src={comment.user.icon}
								alt={comment.user.displayName}
							/>
							<AvatarFallback>
								{comment.user?.displayName.charAt(0) || "?"}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1">
							<div className="flex items-center justify-between">
								<div>
									<span className="font-semibold text-sm">
										{comment.user?.displayName || "deleted_user"}
									</span>
									<span className="text-sm text-muted-foreground ml-2">
										{comment.createdAt}
									</span>
								</div>
								{currentUserId === comment.userId && (
									<DropdownMenu modal={false}>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												className={"h-8 w-8 p-0"}
												aria-label="More options"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onSelect={() => {
													fetcher.submit(
														{ commentId: comment.id, intent: "delete" },
														{ method: "POST", action: "/resources/comment" },
													);
												}}
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
						</div>
					</div>
					<div className="mt-2 whitespace-pre-wrap">{comment.content}</div>
				</div>
			))}
		</div>
	);
}
