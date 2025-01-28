import { useFetcher } from "@remix-run/react";
import { MoreVertical } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useHydrated } from "remix-utils/use-hydrated";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MemoizedParsedContent } from "~/routes/$locale+/user.$handle+/page+/$slug+/components/ParsedContent";
import type { PageCommentWithUser } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/queries.server";
import { AddTranslationFormIntent } from "~/routes/resources+/add-translation-form/route";
import { VoteIntent } from "~/routes/resources+/vote-buttons";

interface CommentListProps {
	pageCommentsWithUser: PageCommentWithUser;
	currentUserId?: number;
	currentHandle: string | undefined;
	showOriginal: boolean;
	showTranslation: boolean;
	locale: string;
}

export function PageCommentList({
	pageCommentsWithUser,
	currentUserId,
	currentHandle,
	showOriginal,
	showTranslation,
	locale,
}: CommentListProps) {
	const fetcher = useFetcher();
	const isHydrated = useHydrated();
	return (
		<div className="space-y-4">
			{pageCommentsWithUser.map((pageComment) => (
				<div key={pageComment.id} className="p-2 border-t">
					<div className="flex items-center">
						<Avatar className="w-6 h-6 mr-3">
							<AvatarImage
								src={pageComment.user.image}
								alt={pageComment.user.name}
							/>
							<AvatarFallback>
								{pageComment.user?.name.charAt(0) || "?"}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1">
							<div className="flex items-center justify-between">
								<div>
									<span className="font-semibold text-sm">
										{pageComment.user?.name || "deleted_user"}
									</span>
									<span className="text-sm text-muted-foreground ml-2">
										{pageComment.createdAt}
									</span>
								</div>
								{currentUserId === pageComment.userId && (
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
														{ pageCommentId: pageComment.id, intent: "delete" },
														{ method: "POST", action: "./comment" },
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
					<div className="mt-2 prose dark:prose-invert">
						{!isHydrated ? (
							<div className="w-full h-full flex items-center justify-center">
								<Loader2 className="w-10 h-10 animate-spin" />
							</div>
						) : (
							<MemoizedParsedContent
								html={pageComment.content}
								segmentWithTranslations={
									pageComment.pageCommentSegmentsWithTranslations
								}
								currentHandle={currentHandle}
								showOriginal={showOriginal}
								showTranslation={showTranslation}
								locale={locale}
								voteIntent={VoteIntent.COMMENT_SEGMENT_TRANSLATION}
								addTranslationFormIntent={
									AddTranslationFormIntent.COMMENT_SEGMENT_TRANSLATION
								}
							/>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
