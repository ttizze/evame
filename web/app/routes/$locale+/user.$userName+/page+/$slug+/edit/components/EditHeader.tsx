import type { User } from "@prisma/client";
import { useFetcher, useLocation } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { Check, Globe, LinkIcon, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { BaseHeaderLayout } from "~/components/BaseHeaderLayout";
import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
interface EditHeaderProps {
	currentUser: User;
	initialIsPublished: boolean | undefined;
	hasUnsavedChanges: boolean;
	onPublishChange: (isPublished: boolean) => void;
	pageId: number | undefined;
}

export function EditHeader({
	currentUser,
	initialIsPublished,
	hasUnsavedChanges,
	onPublishChange,
	pageId,
}: EditHeaderProps) {
	const fetcher = useFetcher();
	const location = useLocation();
	const isSubmitting = fetcher.state === "submitting";
	const [isPublished, setIsPublished] = useState(initialIsPublished);
	const pagePath = location.pathname.replace(/\/edit$/, "");
	const handlePublishChange = (newPublishState: boolean) => {
		setIsPublished(newPublishState);
		onPublishChange(newPublishState);
	};

	const renderButtonIcon = () => {
		if (hasUnsavedChanges) {
			return <Loader2 className="w-4 h-4 animate-spin" />;
		}
		return <Check className="w-4 h-4" data-testid="save-button-check" />;
	};

	const leftExtra = (
		<>
			<Button
				type="submit"
				variant="ghost"
				size="sm"
				className="rounded-full hover:bg-secondary/80"
				disabled={isSubmitting || !hasUnsavedChanges}
				data-testid="save-button"
			>
				{renderButtonIcon()}
			</Button>
			<input
				type="hidden"
				name="isPublished"
				value={isPublished ? "true" : "false"}
			/>
		</>
	);
	const rightExtra = (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={isPublished ? "default" : "secondary"}
					size="sm"
					className="rounded-full flex items-center gap-2 px-4 py-2 transition-colors duration-400"
					disabled={isSubmitting}
				>
					{isPublished ? (
						<Globe className="w-4 h-4" />
					) : (
						<Lock className="w-4 h-4" />
					)}
					<span>{isPublished ? "Public" : "Private"}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-32 rounded-xl p-1" align="end">
				<div className="space-y-1 p-1">
					<button
						type="button"
						className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
						onClick={() => handlePublishChange(true)}
						disabled={isPublished}
					>
						<Globe className="w-4 h-4" />
						<span>Public</span>
					</button>

					<button
						type="button"
						className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
						onClick={() => handlePublishChange(false)}
						disabled={!isPublished}
					>
						<Lock className="w-4 h-4" />
						<span>Private</span>
					</button>
					{pageId && (
						<>
							<Separator />
							<Link
								to={pagePath}
								className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
							>
								<LinkIcon className="w-4 h-4" />
								<span>Preview</span>
							</Link>
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);

	return (
		<BaseHeaderLayout
			currentUser={currentUser}
			leftExtra={leftExtra}
			rightExtra={rightExtra}
			showUserMenu={true}
		/>
	);
}
