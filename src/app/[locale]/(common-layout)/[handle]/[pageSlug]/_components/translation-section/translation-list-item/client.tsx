"use client";
import { Link } from "@tanstack/react-router";
import { EllipsisVertical, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.client";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoteButtons } from "../vote-buttons/client";

interface TranslationItemProps {
	translation: SegmentTranslation;
	onVoted?: () => void;
	onDeleted?: () => void;
	locale?: string;
}

export function TranslationListItem({
	translation,
	onVoted,
	onDeleted,
	locale = "en",
}: TranslationItemProps) {
	const hydrated = useHydrated();
	const [isDeletingTranslation, setIsDeletingTranslation] = useState(false);

	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const isOwner = currentUser?.handle === translation.userHandle;

	const handleDelete = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsDeletingTranslation(true);

		try {
			const response = await fetch("/api/segment-translations", {
				method: "DELETE",
				body: new FormData(event.currentTarget),
				credentials: "same-origin",
			});

			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
				return;
			}

			if (response.ok) {
				onDeleted?.();
			}
		} finally {
			setIsDeletingTranslation(false);
		}
	};

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
						<DropdownMenuContent align="end" className="w-48">
							<form onSubmit={handleDelete}>
								<input
									name="translationId"
									type="hidden"
									value={translation.id}
								/>
								<DropdownMenuItem asChild>
									<button
										className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
										disabled={isDeletingTranslation}
										type="submit"
									>
										<Trash2 className="h-4 w-4" />
										{isDeletingTranslation ? "Deleting..." : "Delete"}
									</button>
								</DropdownMenuItem>
							</form>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</span>
			<span className="flex items-center justify-end">
				<Link
					className="no-underline! mr-2 flex  items-center"
					params={{ handle: translation.userHandle, locale }}
					to="/$locale/$handle"
				>
					<span className="text-sm text-gray-500 text-right flex justify-end items-center  ">
						by: {translation.userName}
					</span>
				</Link>
				<VoteButtons
					locale={locale}
					onVoted={() => {
						onVoted?.();
					}}
					translation={translation}
				/>
			</span>
		</span>
	);
}
