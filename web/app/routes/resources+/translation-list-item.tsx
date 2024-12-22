import { data } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import { EllipsisVertical } from "lucide-react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { TranslationWithVote } from "~/routes/$locale+/$userName+/page+/$slug+/types";
import { sanitizeAndParseText } from "~/routes/$locale+/$userName+/page+/$slug+/utils/sanitize-and-parse-text.client";
import { authenticator } from "~/utils/auth.server";
import { deleteOwnTranslation } from "./functions/mutations.server";
import { VoteButtons } from "./vote-buttons";

const schema = z.object({
	translationId: z.number(),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const translationId = Number.parseInt(
		formData.get("translationId") as string,
	);
	const parsed = schema.safeParse({ translationId });
	if (!parsed.success) {
		return data({ error: "Invalid translationId" }, { status: 400 });
	}
	const currentUser = await authenticator.isAuthenticated(request);
	if (!currentUser) {
		return data({ error: "Unauthorized" }, { status: 403 });
	}
	await deleteOwnTranslation(currentUser.userName, parsed.data.translationId);
	return data({ success: true });
}

interface TranslationItemProps {
	translation: TranslationWithVote;
	currentUserName: string | undefined;
}

export function TranslationListItem({
	translation,
	currentUserName,
}: TranslationItemProps) {
	const isOwner = currentUserName === translation.user.userName;
	const fetcher = useFetcher();

	const onDelete = () => {
		fetcher.submit(
			{ translationId: translation.translateText.id },
			{ method: "post", action: "/resources/translation-list-item" },
		);
	};

	return (
		<div className="pl-4 mt-1  ">
			<div className="flex items-start justify-between">
				<div className="flex">
					<span className="flex-shrink-0 w-5 text-2xl">•</span>
					<span>{sanitizeAndParseText(translation.translateText.text)}</span>
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
								<DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>
			<div className="flex items-center justify-end">
				<Link
					to={`/${translation.user.userName}`}
					className="!no-underline mr-2"
				>
					<p className="text-sm text-gray-500 text-right flex justify-end items-center  ">
						by: {translation.user.displayName}
					</p>
				</Link>
				<VoteButtons translationWithVote={translation} />
			</div>
		</div>
	);
}
