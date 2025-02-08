import type { SegmentTranslationWithVote } from "@/app/[locale]/user/[handle]/page/[slug]/types";
import type { ActionState } from "@/app/types";
import { NavigationLink } from "@/components/navigation-link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { useActionState } from "react";
import { sanitizeAndParseText } from "../../../lib/sanitize-and-parse-text.client";
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
		useActionState<ActionState, FormData>(deleteTranslationAction, {});
	const isOwner = currentHandle === translation.segmentTranslation.user.handle;

	return (
		<div className="pl-4 mt-1  ">
			<div className="flex items-start justify-between">
				<div className="flex">
					<span className="flex-shrink-0 w-5 text-2xl">•</span>
					<span>
						{sanitizeAndParseText(translation.segmentTranslation.text)}
					</span>
				</div>
				{isOwner && (
					<div className="">
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
					</div>
				)}
			</div>
			<div className="flex items-center justify-end">
				<NavigationLink
					href={`/user/${translation.segmentTranslation.user.handle}`}
					className="!no-underline mr-2"
				>
					<p className="text-sm text-gray-500 text-right flex justify-end items-center  ">
						by: {translation.segmentTranslation.user.name}
					</p>
				</NavigationLink>
				<VoteButtons
					translationWithVote={translation}
					voteTarget={voteTarget}
				/>
			</div>
		</div>
	);
}
