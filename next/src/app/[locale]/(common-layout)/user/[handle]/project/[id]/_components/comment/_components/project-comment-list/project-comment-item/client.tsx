"use client";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import type { ProjectCommentWithUserAndTranslations } from "../_lib/fetch-project-comments-with-user-and-translations";

export function ProjectCommentItemClient({
	projectComment,
	currentHandle,
}: {
	projectComment: ProjectCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
}) {
	const isMyComment = currentHandle === projectComment.user.handle;

	if (!isMyComment) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<MoreHorizontal className="h-4 w-4" />
					<span className="sr-only">Open menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					disabled
					className="text-destructive"
					onClick={() => {
						// 削除機能は未実装
					}}
				>
					<Trash className="mr-2 h-4 w-4" />
					Delete
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled
					onClick={() => {
						// 編集機能は未実装
					}}
				>
					<Pencil className="mr-2 h-4 w-4" />
					Edit
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
