import { TranslationVote } from "./translation-vote";
import type { SubmitTranslationVote, TranslationCandidate } from "./types";

type TranslationCandidateProps = {
	candidate: TranslationCandidate;
	position: number;
	authenticated: boolean;
	onVote: SubmitTranslationVote;
	locale?: string;
};

const copy = {
	ja: { candidate: "訳", publicCandidate: "公開訳候補" },
	en: { candidate: "Candidate", publicCandidate: "Published candidate" },
} as const;

export function TranslationCandidateCard({
	candidate,
	position,
	authenticated,
	onVote,
	locale = "ja",
}: TranslationCandidateProps) {
	const labels = locale.toLowerCase().startsWith("ja") ? copy.ja : copy.en;

	return (
		<li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h3 className="text-sm font-semibold tracking-wide text-slate-700">
					{labels.candidate} {position}
				</h3>
				<p className="text-xs text-slate-500">{labels.publicCandidate}</p>
			</div>
			<p
				className="mt-4 whitespace-pre-wrap text-[1.0625rem] leading-[2] text-slate-900"
				lang={candidate.locale ?? locale}
			>
				{candidate.text}
			</p>
			<div className="mt-6 border-t border-slate-100 pt-4">
				<TranslationVote
					authenticated={authenticated}
					candidateId={candidate.id}
					locale={locale}
					onVote={onVote}
					voteCount={candidate.voteCount}
					votedByViewer={candidate.votedByViewer}
				/>
			</div>
		</li>
	);
}
