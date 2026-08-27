import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getScriptureCopy } from "./copy";
import { buildLoginHref } from "./login-link";
import type { SubmitTranslationVote, VoteResult } from "./types";

type TranslationVoteProps = {
	candidateId: string;
	voteCount: number;
	votedByViewer: boolean | null;
	authenticated: boolean;
	onVote: SubmitTranslationVote;
	locale?: string;
	loginHref?: string;
};

export function TranslationVote({
	candidateId,
	voteCount,
	votedByViewer,
	authenticated,
	onVote,
	locale = "ja",
	loginHref,
}: TranslationVoteProps) {
	const labels = getScriptureCopy(locale);
	const resolvedLoginHref = loginHref ?? buildLoginHref(locale, `/${locale}`);
	const [vote, setVote] = useState<VoteResult>({
		voted: votedByViewer,
		voteCount,
	});
	const [pending, setPending] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState(false);

	async function handleVote(value: "up" | "down") {
		if (!authenticated) {
			setNotice(labels.voteLogin);
			setError(false);
			return;
		}

		setNotice(null);
		setError(false);
		setPending(true);

		try {
			const removalVote =
				vote.voted === true && value === "up"
					? true
					: vote.voted === false && value === "down"
						? false
						: null;
			const result = await onVote({
				candidateId,
				...(removalVote === null
					? { value }
					: { currentVote: removalVote, value: "remove" as const }),
			});
			setVote(result);
		} catch {
			setNotice(labels.voteError);
			setError(true);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			<div className="flex h-8">
				<Button
					aria-label={
						pending
							? labels.saving
							: vote.voted === true
								? labels.removeUp
								: labels.up
					}
					aria-pressed={vote.voted === true}
					className="gap-1"
					disabled={pending}
					onClick={() => handleVote("up")}
					size="sm"
					type="button"
					variant="ghost"
				>
					<ThumbsUp
						aria-hidden="true"
						className={cn(
							"h-4 w-4 transition-all duration-300",
							vote.voted === true && "[&>path]:fill-primary",
							pending && "animate-bounce",
						)}
					/>
					<span className="tabular-nums">
						{labels.voteCount(vote.voteCount)}
					</span>
				</Button>
				<Button
					aria-label={
						pending
							? labels.saving
							: vote.voted === false
								? labels.removeDown
								: labels.down
					}
					aria-pressed={vote.voted === false}
					className="px-2"
					disabled={pending}
					onClick={() => handleVote("down")}
					size="sm"
					type="button"
					variant="ghost"
				>
					<ThumbsDown
						aria-hidden="true"
						className={cn(
							"h-4 w-4 transition-all duration-300",
							vote.voted === false && "[&>path]:fill-primary",
							pending && "animate-bounce",
						)}
					/>
				</Button>
			</div>
			{notice ? (
				<p
					aria-live="polite"
					className={cn(
						"text-sm",
						error ? "text-destructive" : "text-muted-foreground",
					)}
					role={error ? "alert" : "status"}
				>
					{!authenticated ? (
						<a
							className="underline underline-offset-4"
							href={resolvedLoginHref}
						>
							{notice}
						</a>
					) : (
						notice
					)}
				</p>
			) : null}
		</div>
	);
}
