"use client";
import { EllipsisVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import type {
	SubmitTranslationVote,
	TranslationCandidate,
} from "@/components/scripture/types";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoteButtons } from "../vote-buttons/client";

export function TranslationListItem({
	authenticated,
	loginHref,
	onDeleted,
	onVoted,
	onVote,
	translation,
	locale,
	onDeleteTranslation,
}: {
	authenticated: boolean;
	loginHref?: string;
	onDeleted?: () => void;
	onVoted?: () => void;
	onVote: SubmitTranslationVote;
	translation: TranslationCandidate;
	locale: string;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
}) {
	const labels = getScriptureCopy(locale);
	const [isDeletingTranslation, setIsDeletingTranslation] = useState(false);
	const [deleted, setDeleted] = useState(false);
	const canDelete =
		authenticated &&
		translation.ownedByViewer &&
		onDeleteTranslation !== undefined;

	async function deleteTranslation() {
		if (!onDeleteTranslation) return;
		setIsDeletingTranslation(true);
		try {
			await onDeleteTranslation(translation.id);
			setDeleted(true);
			onDeleted?.();
		} finally {
			setIsDeletingTranslation(false);
		}
	}

	if (deleted) return null;

	return (
		<span className="pl-4 mt-1 block">
			<span className="flex items-start justify-between">
				<span className="flex">
					<span className="shrink-0 w-5 text-2xl">•</span>
					<span lang={translation.locale ?? locale}>{translation.text}</span>
				</span>
				{canDelete && (
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<Button
								aria-label={labels.delete}
								className="h-8 w-8 p-0"
								type="button"
								variant="ghost"
							>
								<EllipsisVertical className="h-6 w-6 text-gray-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem asChild>
								<button
									className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
									disabled={isDeletingTranslation}
									onClick={deleteTranslation}
									type="button"
								>
									<Trash2 className="h-4 w-4" />
									{isDeletingTranslation ? labels.deleting : labels.delete}
								</button>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</span>
			<span className="flex items-center justify-end">
				<span className="no-underline! mr-2 flex items-center">
					<span className="text-sm text-gray-500 text-right flex justify-end items-center">
						{labels.by} {translation.userName} (@{translation.userHandle})
						{translation.userIsAi ? (
							<span className="ml-2 font-medium">({labels.aiLabel})</span>
						) : null}
					</span>
				</span>
				<VoteButtons
					authenticated={authenticated}
					locale={locale}
					loginHref={loginHref}
					onVote={onVote}
					onVoted={onVoted}
					translation={translation}
				/>
			</span>
		</span>
	);
}
