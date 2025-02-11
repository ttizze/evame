import type { SegmentTranslationWithVote } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/types";
import { sanitizeAndParseText } from "@/app/[locale]/lib/sanitize-and-parse-text.client";
import type { ActionResponse } from "@/app/types";
import { NavigationLink } from "@/components/navigation-link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { useActionState } from "react";
import { VoteButtons } from "../vote-buttons";
import type { VoteTarget } from "../vote-buttons/constants";
import { deleteTranslationAction } from "./action";

interface TranslationItemProps {
	translation: SegmentTranslationWithVote;
	currentHandle: string | undefined;
	voteTarget: VoteTarget;
}

export function TranslationListItem({
	translation,
	currentHandle,
	voteTarget,
}: TranslationItemProps) {
	const [deleteTranslationState, action, isDeletingTranslation] =
		useActionState<ActionResponse, FormData>(deleteTranslationAction, {
			success: false,
		});
	const isOwner = currentHandle === translation.segmentTranslation.user.handle;

	return (
		<span className="pl-4 mt-1 block">
			<span className="flex items-start justify-between">
				<span className="flex">
					<span className="flex-shrink-0 w-5 text-2xl">•</span>
					<span>
						{sanitizeAndParseText(translation.segmentTranslation.text)}
					</span>
				</span>
				{isOwner && (
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="ghost" className="h-8 w-8 p-0 ">
								<EllipsisVertical className="h-6 w-6 text-gray-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<form action={action}>
								<input
									type="hidden"
									name="translationId"
									value={translation.segmentTranslation.id}
								/>
								<button
									type="submit"
									className="w-full text-left"
									disabled={isDeletingTranslation}
								>
									Delete
								</button>
							</form>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</span>
			<span className="flex items-center justify-end">
				<NavigationLink
					href={`/user/${translation.segmentTranslation.user.handle}`}
					className="!no-underline mr-2 flex  items-center"
				>
					<span className="text-sm text-gray-500 text-right flex justify-end items-center  ">
						by: {translation.segmentTranslation.user.name}
					</span>
				</NavigationLink>
				<VoteButtons
					translationWithVote={translation}
					voteTarget={voteTarget}
				/>
			</span>
		</span>
	);
}
