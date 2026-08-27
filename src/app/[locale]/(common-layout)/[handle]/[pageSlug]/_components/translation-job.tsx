import { useEffect, useState } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import { buildLoginHref } from "@/components/scripture/login-link";
import type {
	CreateTranslationJob,
	GetTranslationJob,
	TranslationJob,
	TranslationJobStatus,
} from "@/components/scripture/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	DEFAULT_TRANSLATION_MODEL,
	TRANSLATION_MODELS,
} from "@/translation/types";

type AiTranslationJobProps = {
	authenticated: boolean;
	scriptureId: string;
	locale: string;
	createTranslationJob: CreateTranslationJob;
	getTranslationJob: GetTranslationJob;
	loginHref?: string;
};

const terminalStatuses = new Set<TranslationJobStatus>(["COMPLETED", "FAILED"]);

export function AiTranslationJob({
	authenticated,
	scriptureId,
	locale,
	createTranslationJob,
	getTranslationJob,
	loginHref,
}: AiTranslationJobProps) {
	const [job, setJob] = useState<TranslationJob | null>(null);
	const [model, setModel] = useState<string>(DEFAULT_TRANSLATION_MODEL);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const labels = getScriptureCopy(locale);
	const resolvedLoginHref = loginHref ?? buildLoginHref(locale, `/${locale}`);

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
				if (!cancelled) setError(labels.jobStatusError);
			}
		};

		timeoutId = setTimeout(poll, 500);
		return () => {
			cancelled = true;
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [getTranslationJob, job, labels.jobStatusError]);

	async function handleCreateJob() {
		setPending(true);
		setError(null);
		try {
			const input: Parameters<CreateTranslationJob>[0] = {
				scriptureId,
				locale,
				...(model === DEFAULT_TRANSLATION_MODEL ? {} : { model }),
			};
			setJob(await createTranslationJob(input));
		} catch {
			setError(labels.jobStartError);
		} finally {
			setPending(false);
		}
	}

	if (!authenticated) {
		return (
			<p className="mt-4 px-4 text-sm text-muted-foreground">
				<a className="underline underline-offset-4" href={resolvedLoginHref}>
					{labels.jobLogin}
				</a>
			</p>
		);
	}

	const status = job ? labels.status[job.status] : null;
	const progress = job
		? { PENDING: 15, IN_PROGRESS: 50, COMPLETED: 100, FAILED: 100 }[job.status]
		: 0;

	return (
		<section aria-labelledby="ai-translation-title" className="border-t pt-6">
			<div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
				<div>
					<h3 className="text-lg font-semibold" id="ai-translation-title">
						{labels.jobTitle}
					</h3>
					<p className="mt-1 text-sm leading-6 text-muted-foreground">
						{labels.jobDescription}
					</p>
				</div>
				<div>
					<Label htmlFor="translation-model">{labels.jobModel}</Label>
					<select
						aria-label={labels.jobModel}
						className="mt-2 h-9 min-w-52 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
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
				<Button
					className="w-full sm:w-auto"
					disabled={
						pending || (job !== null && !terminalStatuses.has(job.status))
					}
					onClick={handleCreateJob}
					type="button"
				>
					{pending
						? labels.jobStarting
						: job?.status === "FAILED"
							? labels.jobRetry
							: labels.jobStart}
				</Button>
			</div>
			{job ? (
				<div className="mt-6 space-y-2">
					<div className="flex items-center justify-between gap-4 text-sm">
						<p
							aria-live="polite"
							className="text-muted-foreground"
							role="status"
						>
							{labels.jobProgress}
						</p>
						<strong>{status}</strong>
					</div>
					<Progress
						aria-label={labels.jobProgress}
						aria-valuetext={status ?? undefined}
						value={progress}
					/>
				</div>
			) : null}
			{error ? (
				<p className="mt-3 text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</section>
	);
}
