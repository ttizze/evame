import type { PageStatus } from "@prisma/client";
import { MoreVertical } from "lucide-react";
import { NavLocaleLink } from "~/components/NavLocaleLink";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
interface PageActionsDropdownProps {
	editPath: string;
	onTogglePublic: () => void;
	onDelete: () => void;
	status: PageStatus;
	className?: string;
}

export function PageActionsDropdown({
	editPath,
	onTogglePublic,
	onDelete,
	status,
	className = "",
}: PageActionsDropdownProps) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className={`h-8 w-8 p-0 ${className}`}
					aria-label="More options"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<NavLocaleLink to={editPath}>Edit</NavLocaleLink>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onTogglePublic}>
					{status === "PUBLIC" ? "Make Private" : "Make Public"}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
