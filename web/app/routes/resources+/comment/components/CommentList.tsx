import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { FC, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

interface User {
	userName: string;
	displayName: string;
	icon: string;
}

interface Comment {
	id: number;
	content: string;
	createdAt: string;
	user: User | null;
	userId: number | null;
}

interface CommentListProps {
	comments: Comment[];
	currentUserId?: number;
	onDelete?: (commentId: number) => void;
}

export const CommentList: FC<CommentListProps> = ({
	comments,
	currentUserId,
	onDelete,
}) => {
	const { t, i18n } = useTranslation();

	const handleDelete = async (commentId: number, e: MouseEvent) => {
		e.preventDefault();
		if (!onDelete) return;

		try {
			const formData = new FormData();
			formData.append("commentId", commentId.toString());
			formData.append("intent", "delete");
			formData.append("content", "dummy"); // contentは必須だが削除時は使用しない
			formData.append("pageId", "0"); // pageIdは必須だが削除時は使用しない

			const response = await fetch("/resources/comment", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete comment");
			}

			onDelete(commentId);
		} catch (error) {
			console.error("Failed to delete comment:", error);
		}
	};

	return (
		<div className="space-y-4">
			{comments.map((comment) => (
				<div key={comment.id} className="flex gap-4 p-4 bg-card rounded-lg">
					<Avatar className="w-10 h-10">
						{comment.user?.icon && (
							<AvatarImage
								src={comment.user.icon}
								alt={comment.user.displayName}
							/>
						)}
						<AvatarFallback>
							{comment.user?.displayName.charAt(0) || "?"}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1">
						<div className="flex items-center justify-between">
							<div>
								<span className="font-semibold">
									{comment.user?.displayName || t("comment.deleted_user")}
								</span>
								<span className="text-sm text-muted-foreground ml-2">
									{formatDistanceToNow(new Date(comment.createdAt), {
										addSuffix: true,
										locale: i18n.language === "ja" ? ja : undefined,
									})}
								</span>
							</div>
							{currentUserId === comment.userId && (
								<Button
									variant="ghost"
									size="sm"
									onClick={(e) => handleDelete(comment.id, e)}
								>
									{t("comment.delete")}
								</Button>
							)}
						</div>
						<p className="mt-2 whitespace-pre-wrap">{comment.content}</p>
					</div>
				</div>
			))}
		</div>
	);
};
