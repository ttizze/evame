import { parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { memo, useMemo } from "react";
import { z } from "zod";
import { VoteButton } from "~/routes/$locale+/user.$handle+/page+/$slug+/components/sourceTextAndTranslationSection/VoteButton";
import type { TranslationWithVote } from "~/routes/$locale+/user.$handle+/page+/$slug+/types";
import { authenticator } from "~/utils/auth.server";
import { cn } from "~/utils/cn";
import { handleVote } from "./functions/mutations.server";

export const schema = z.object({
	translateTextId: z.number(),
	isUpvote: z.preprocess((val) => val === "true", z.boolean()),
});

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});
	const submission = parseWithZod(await request.formData(), {
		schema,
	});
	if (submission.status !== "success") {
		return { lastResult: submission.reply() };
	}
	await handleVote(
		submission.value.translateTextId,
		submission.value.isUpvote,
		currentUser.id,
	);
	return {
		lastResult: submission.reply({ resetForm: true }),
	};
}

interface VoteButtonsProps {
	translationWithVote: TranslationWithVote;
}

export const VoteButtons = memo(function VoteButtons({
	translationWithVote,
}: VoteButtonsProps) {
	const fetcher = useFetcher();

	const isVoting = fetcher.state !== "idle";

	const optimisticVote = useMemo(() => {
		if (fetcher.formData) {
			const newVote = fetcher.formData.get("isUpvote") === "true";
			if (translationWithVote.vote?.isUpvote === newVote) {
				return null;
			}
			return { isUpvote: newVote };
		}
		return translationWithVote.vote;
	}, [fetcher.formData, translationWithVote.vote]);

	const optimisticPoint = useMemo(() => {
		if (fetcher.formData) {
			const newVote = fetcher.formData.get("isUpvote") === "true";
			const currentPoint = translationWithVote.translateText.point;
			const currentVote = translationWithVote.vote;

			if (currentVote) {
				if (currentVote.isUpvote === newVote) {
					return newVote ? currentPoint - 1 : currentPoint + 1;
				}
				return newVote ? currentPoint + 2 : currentPoint - 2;
			}
			return newVote ? currentPoint + 1 : currentPoint - 1;
		}
		return translationWithVote.translateText.point;
	}, [
		fetcher.formData,
		translationWithVote.translateText.point,
		translationWithVote.vote,
	]);

	const buttonClasses = useMemo(
		() => ({
			upVote: cn(
				"mr-2 h-4 w-4 transition-all duration-300",
				optimisticVote?.isUpvote === true && "[&>path]:fill-primary",
				isVoting && "animate-bounce",
			),
			downVote: cn(
				"mr-2 h-4 w-4 transition-all duration-300",
				optimisticVote?.isUpvote === false && "[&>path]:fill-primary",
				isVoting && "animate-bounce",
			),
		}),
		[optimisticVote?.isUpvote, isVoting],
	);

	const handleVoteClick = (e: React.MouseEvent, isUpvote: boolean) => {
		const formData = new FormData();
		formData.append(
			"translateTextId",
			translationWithVote.translateText.id.toString(),
		);
		formData.append("isUpvote", isUpvote.toString());
		fetcher.submit(formData, {
			method: "post",
			action: "/resources/vote-buttons",
		});
	};

	return (
		<div className="flex justify-end items-center">
			<div className="space-x-2 flex">
				<VoteButton
					isUpvote={true}
					isDisabled={isVoting}
					point={optimisticPoint}
					iconClass={buttonClasses.upVote}
					onClick={handleVoteClick}
				/>
				<VoteButton
					isUpvote={false}
					isDisabled={isVoting}
					iconClass={buttonClasses.downVote}
					onClick={handleVoteClick}
				/>
			</div>
		</div>
	);
});
