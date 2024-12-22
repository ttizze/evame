import { NavLocaleLink } from "~/components/NavLocaleLink";
import { MoreVertical } from "lucide-react";
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
	isPublished: boolean;
	className?: string;
}

export function PageActionsDropdown({
	editPath,
	onTogglePublic,
	onDelete,
	isPublished,
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
					{isPublished ? "Make Private" : "Make Public"}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
