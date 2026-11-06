import { MoreVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageStatus } from "@/db/types";
import type { ArchivePageState } from "../delete-page-dialog/action";
import { DeletePageDialog } from "../delete-page-dialog/delete-page-dialog";
import type { TogglePublishState } from "./action";

interface PageActionsDropdownProps {
	status: PageStatus;
	locale: string;
	handle: string;
	pageSlug: string;
	publish: () => Promise<TogglePublishState>;
	archive: () => Promise<ArchivePageState>;
	onUpdated: () => void;
}

export function PageActionsDropdown({
	status,
	locale,
	handle,
	pageSlug,
	publish,
	archive,
	onUpdated,
}: PageActionsDropdownProps) {
	const [isPublishing, startPublishing] = useTransition();
	const publishAction = async () => {
		startPublishing(async () => {
			try {
				const result = await publish();
				if (result.success) {
					toast.success(result.message);
					onUpdated();
				} else if (result.message) toast.error(result.message);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update page status",
				);
			}
		});
	};
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	return (
		<>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label="More options"
						className="h-8 w-6 cursor-pointer p-0"
						variant="ghost"
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild className="w-full cursor-pointer text-left">
						<a
							className="w-full text-left"
							href={`/${locale}/${handle}/${pageSlug}/edit`}
						>
							Edit
						</a>
					</DropdownMenuItem>
					<DropdownMenuItem className="w-full cursor-pointer text-left">
						<form action={publishAction}>
							<button
								className="w-full text-left"
								disabled={isPublishing}
								type="submit"
							>
								{status === "PUBLIC" ? "Make Private" : "Make Public"}
							</button>
						</form>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<button
							className="w-full cursor-pointer text-left text-red-500"
							onClick={() => setDeleteDialogOpen(true)}
							type="button"
						>
							Delete
						</button>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DeletePageDialog
				archive={archive}
				onDeleted={onUpdated}
				onOpenChange={setDeleteDialogOpen}
				open={deleteDialogOpen}
			/>
		</>
	);
}
