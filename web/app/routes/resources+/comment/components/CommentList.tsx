import type { FC, MouseEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import type { CommentWithUser } from "~/routes/$locale+/user.$userName+/page+/$slug+/functions/queries.server";

interface CommentListProps {
  commentsWithUser: CommentWithUser;
  currentUserId?: number;
  onDelete?: (commentId: number) => void;
}

export const CommentList: FC<CommentListProps> = ({
  commentsWithUser,
  currentUserId,
  onDelete,
}) => {

  const handleDelete = async (commentId: number, e: MouseEvent) => {
    e.preventDefault();
    if (!onDelete) return;

    try {
      const formData = new FormData();
      formData.append("commentId", commentId.toString());
      formData.append("intent", "delete");
      formData.append("content", "dummy");
      formData.append("pageId", "0");

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
      {commentsWithUser.map((comment) => (
        <div key={comment.id} className="flex gap-4 p-4 bg-card rounded-lg">
          <Avatar className="w-6 h-6 mr-2">
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
                <span className="font-semibold">
                  {comment.user?.displayName || "deleted_user"}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  {comment.createdAt}
                </span>
              </div>
              {currentUserId === comment.userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(comment.id, e)}
                >
                  delete
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
