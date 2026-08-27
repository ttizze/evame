import { useEffect, useState } from "react";
import {
	DEFAULT_TRANSLATION_MODEL,
	TRANSLATION_MODELS,
} from "@/translation/types";
import type {
	CreateTranslationJob,
	GetTranslationJob,
	TranslationJob,
	TranslationJobStatus,
} from "./types";

type AiTranslationJobProps = {
	authenticated: boolean;
	scriptureId: string;
	locale: string;
	createTranslationJob: CreateTranslationJob;
	getTranslationJob: GetTranslationJob;
};

const terminalStatuses = new Set<TranslationJobStatus>(["COMPLETED", "FAILED"]);

const statusLabels: Record<string, Record<TranslationJobStatus, string>> = {
	ja: {
		PENDING: "待機中",
		IN_PROGRESS: "処理中",
		COMPLETED: "完了",
		FAILED: "失敗",
	},
	en: {
		PENDING: "Pending",
		IN_PROGRESS: "In progress",
		COMPLETED: "Completed",
		FAILED: "Failed",
	},
};

const copy = {
	ja: {
		title: "AI翻訳",
		description: "この仏典を選択中の言語へ翻訳するジョブを開始します。",
		model: "AIモデル",
		start: "AI翻訳を開始",
		retry: "AI翻訳を再試行",
		starting: "開始中…",
		progress: "進捗",
		login: "AI翻訳を利用するにはログインしてください。",
		statusError: "AI翻訳の状態を取得できませんでした。",
		startError: "AI翻訳を開始できませんでした。時間をおいてお試しください。",
	},
	en: {
		title: "AI translation",
		description:
			"Start a job to translate this scripture into the selected language.",
		model: "Translation model",
		start: "Start AI translation",
		retry: "Retry AI translation",
		starting: "Starting…",
		progress: "Progress",
		login: "Log in to use AI translation.",
		statusError: "The AI translation status could not be loaded.",
		startError: "AI translation could not be started. Please try again later.",
	},
} as const;

function getStatusLabel(locale: string, status: TranslationJobStatus) {
	return (statusLabels[locale] ?? statusLabels.en)[status];
}

export function AiTranslationJob({
	authenticated,
	scriptureId,
	locale,
	createTranslationJob,
	getTranslationJob,
}: AiTranslationJobProps) {
	const [job, setJob] = useState<TranslationJob | null>(null);
	const [model, setModel] = useState<string>(DEFAULT_TRANSLATION_MODEL);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const labels = locale.toLowerCase().startsWith("ja") ? copy.ja : copy.en;

	useEffect(() => {
		if (!job || terminalStatuses.has(job.status)) return;

		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const poll = async () => {
			try {
				const nextJob = await getTranslationJob(job.id);
				if (cancelled) return;
				setJob(nextJob);
				if (!terminalStatuses.has(nextJob.status)) {
					timeoutId = setTimeout(poll, 1500);
				}
			} catch {
				if (!cancelled) {
					setError(labels.statusError);
				}
			}
		};

		timeoutId = setTimeout(poll, 500);
		return () => {
			cancelled = true;
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [getTranslationJob, job, labels.statusError]);

	async function handleCreateJob() {
		setPending(true);
		setError(null);
		try {
			const input: Parameters<CreateTranslationJob>[0] = {
				scriptureId,
				locale,
				...(model === DEFAULT_TRANSLATION_MODEL ? {} : { model }),
			};
			const createdJob = await createTranslationJob(input);
			setJob(createdJob);
		} catch {
			setError(labels.startError);
		} finally {
			setPending(false);
		}
	}

	if (!authenticated) {
		return (
			<p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				{labels.login}
			</p>
		);
	}

	const status = job ? getStatusLabel(locale, job.status) : null;

	return (
		<section
			aria-labelledby="ai-translation-title"
			className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
		>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h3
						className="text-lg font-semibold text-slate-900"
						id="ai-translation-title"
					>
						{labels.title}
					</h3>
					<p className="mt-1 text-sm leading-6 text-slate-600">
						{labels.description}
					</p>
				</div>
				<div>
					<label
						className="text-sm font-medium text-slate-700"
						htmlFor="translation-model"
					>
						{labels.model}
					</label>
					<select
						aria-label={labels.model}
						className="mt-2 h-11 min-w-52 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
						id="translation-model"
						onChange={(event) => setModel(event.target.value)}
						value={model}
					>
						{TRANSLATION_MODELS.map((availableModel) => (
							<option key={availableModel} value={availableModel}>
								{availableModel}
							</option>
						))}
					</select>
				</div>
				<button
					className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
					disabled={
						pending || (job !== null && !terminalStatuses.has(job.status))
					}
					onClick={handleCreateJob}
					type="button"
				>
					{pending
						? labels.starting
						: job?.status === "FAILED"
							? labels.retry
							: labels.start}
				</button>
			</div>
			{job ? (
				<p
					aria-live="polite"
					className="mt-4 text-sm text-slate-700"
					role="status"
				>
					{labels.progress}: <strong>{status}</strong>
				</p>
			) : null}
			{error ? (
				<p className="mt-3 text-sm text-red-700" role="alert">
					{error}
				</p>
			) : null}
		</section>
	);
}
