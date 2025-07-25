import { EllipsisVertical } from "lucide-react";
import { useActionState } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_lib/sanitize-and-parse-text.client";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import type { BaseTranslation } from "@/app/[locale]/types";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { VoteButtons } from "../vote-buttons/client";
import { deleteTranslationAction } from "./action";

interface TranslationItemProps {
	translation: BaseTranslation;
	currentHandle: string | undefined;
	targetContentType: TargetContentType;
}

export function TranslationListItem({
	translation,
	currentHandle,
	targetContentType,
}: TranslationItemProps) {
	const [_deleteTranslationState, action, isDeletingTranslation] =
		useActionState<ActionResponse, FormData>(deleteTranslationAction, {
			success: false,
		});
	const isOwner = currentHandle === translation.user.handle;

	return (
		<span className="pl-4 mt-1 block">
			<span className="flex items-start justify-between">
				<span className="flex">
					<span className="shrink-0 w-5 text-2xl">•</span>
					<span>{sanitizeAndParseText(translation.text)}</span>
				</span>
				{isOwner && (
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<Button className="h-8 w-8 p-0 " type="button" variant="ghost">
								<EllipsisVertical className="h-6 w-6 text-gray-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<form action={action}>
								<input
									name="translationId"
									type="hidden"
									value={translation.id}
								/>
								<button
									className="w-full text-left"
									disabled={isDeletingTranslation}
									type="submit"
								>
									Delete
								</button>
							</form>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</span>
			<span className="flex items-center justify-end">
				<Link
					className="no-underline! mr-2 flex  items-center"
					href={`/user/${translation.user.handle}`}
				>
					<span className="text-sm text-gray-500 text-right flex justify-end items-center  ">
						by: {translation.user.name}
					</span>
				</Link>
				<VoteButtons
					key={`${translation.id}-${translation.point}-${translation.currentUserVote?.isUpvote ?? "null"}`}
					targetContentType={targetContentType}
					translation={translation}
				/>
			</span>
		</span>
	);
}
