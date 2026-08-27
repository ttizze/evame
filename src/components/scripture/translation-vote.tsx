import { useState } from "react";
import type { SubmitTranslationVote, VoteResult } from "./types";

type TranslationVoteProps = {
	candidateId: string;
	voteCount: number;
	votedByViewer: boolean | null;
	authenticated: boolean;
	onVote: SubmitTranslationVote;
	locale?: string;
};

const copy = {
	ja: {
		up: "この訳に投票",
		down: "この訳に反対票",
		removeUp: "投票を取り消す",
		removeDown: "反対票を取り消す",
		saving: "保存中…",
		login: "投票するにはログインが必要です。",
		error: "投票を保存できませんでした。時間をおいてお試しください。",
		voteCount: (count: number) => `${count}票`,
	},
	en: {
		up: "Vote for this translation",
		down: "Downvote this translation",
		removeUp: "Remove vote",
		removeDown: "Remove downvote",
		saving: "Saving…",
		login: "Log in to vote.",
		error: "The vote could not be saved. Please try again later.",
		voteCount: (count: number) => `${count} vote${count === 1 ? "" : "s"}`,
	},
} as const;

export function TranslationVote({
	candidateId,
	voteCount,
	votedByViewer,
	authenticated,
	onVote,
	locale = "ja",
}: TranslationVoteProps) {
	const labels = locale.toLowerCase().startsWith("ja") ? copy.ja : copy.en;
	const [vote, setVote] = useState<VoteResult>({
		voted: votedByViewer,
		voteCount,
	});
	const [pending, setPending] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState(false);

	async function handleVote(value: "up" | "down") {
		if (!authenticated) {
			setNotice(labels.login);
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
			setNotice(labels.error);
			setError(true);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<button
				aria-label={vote.voted === true ? labels.removeUp : labels.up}
				aria-pressed={vote.voted === true}
				className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
					vote.voted === true
						? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
						: "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50"
				}`}
				disabled={pending}
				onClick={() => handleVote("up")}
				type="button"
			>
				<span aria-hidden="true" className="text-base leading-none">
					{vote.voted === true ? "✓" : "＋"}
				</span>
				{pending
					? labels.saving
					: vote.voted === true
						? labels.removeUp
						: labels.up}
			</button>
			<button
				aria-label={vote.voted === false ? labels.removeDown : labels.down}
				aria-pressed={vote.voted === false}
				className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
					vote.voted === false
						? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
						: "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50"
				}`}
				disabled={pending}
				onClick={() => handleVote("down")}
				type="button"
			>
				<span aria-hidden="true" className="text-base leading-none">
					{vote.voted === false ? "✓" : "−"}
				</span>
				{pending
					? labels.saving
					: vote.voted === false
						? labels.removeDown
						: labels.down}
			</button>
			<span aria-live="polite" className="text-sm tabular-nums text-slate-500">
				{labels.voteCount(vote.voteCount)}
			</span>
			{notice ? (
				<p
					aria-live="polite"
					className={
						error ? "text-sm text-destructive" : "text-sm text-[#725f43]"
					}
					role={error ? "alert" : "status"}
				>
					{notice}
				</p>
			) : null}
		</div>
	);
}
