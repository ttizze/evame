"use client";

import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentActionMenuProps {
	children: ReactNode; // <DropdownMenuItem …> を並べる
}

export function CommentActionMenu({ children }: CommentActionMenuProps) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-8 w-8 p-0"
					aria-label="More options"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">{children}</DropdownMenuContent>
		</DropdownMenu>
	);
}
