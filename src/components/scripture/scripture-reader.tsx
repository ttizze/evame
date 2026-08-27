import { useState } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { ScriptureBreadcrumbs } from "./scripture-breadcrumbs";
import { TranslationCandidateCard } from "./translation-candidate";
import { TranslationForm } from "./translation-form";
import { AiTranslationJob } from "./translation-job";
import type {
	CreateTranslation,
	CreateTranslationJob,
	GetTranslationJob,
	ScriptureDetail,
	ScriptureSegment,
	SubmitTranslationVote,
} from "./types";

type ScriptureReaderProps = {
	detail: ScriptureDetail;
	authenticated: boolean;
	onVote: SubmitTranslationVote;
	locale?: string;
	onCreateTranslation?: CreateTranslation;
	createTranslationJob?: CreateTranslationJob;
	getTranslationJob?: GetTranslationJob;
};

type ReadingMode = "both" | "source" | "translation";

const copy = {
	ja: {
		sectionLabel: "パーリ語仏典",
		source: "パーリ原文",
		passage: "本文",
		annotation: "注釈",
		translations: "翻訳候補",
		translationDescription:
			"公開されている訳を並べています。よりふさわしいと思う訳に投票できます。",
		noTranslations: "この言語の翻訳はまだ公開されていません。",
		mode: "表示モード",
		both: "原文と翻訳",
		sourceOnly: "原文のみ",
		translationOnly: "翻訳のみ",
	},
	en: {
		sectionLabel: "Pāli canon",
		source: "Pāli source",
		passage: "Passage",
		annotation: "Annotation",
		translations: "Translation candidates",
		translationDescription:
			"Compare published translations and vote for the one you find most faithful.",
		noTranslations: "No translation is published for this language yet.",
		mode: "View",
		both: "Source + translation",
		sourceOnly: "Source only",
		translationOnly: "Translation only",
	},
} as const;

function getCopy(locale: string) {
	return locale.toLowerCase().startsWith("ja") ? copy.ja : copy.en;
}

function translationsForLocale(segment: ScriptureSegment, locale: string) {
	const localized = segment.translations.filter(
		(candidate) => candidate.locale,
	);
	return localized.length === 0
		? segment.translations
		: segment.translations.filter((candidate) => candidate.locale === locale);
}

function SegmentReading({
	authenticated,
	availableLocales,
	locale,
	onCreateTranslation,
	onVote,
	segment,
	sourceLocale,
	translationsVisible,
	sourceVisible,
}: {
	authenticated: boolean;
	availableLocales: Array<{ code: string; label: string }>;
	locale: string;
	onCreateTranslation?: CreateTranslation;
	onVote: SubmitTranslationVote;
	segment: ScriptureSegment;
	sourceLocale: string;
	translationsVisible: boolean;
	sourceVisible: boolean;
}) {
	const labels = getCopy(locale);
	const isAnnotation = segment.kind === "COMMENTARY";
	const headingId = `segment-${segment.id}-title`;
	const translationHeadingId = `segment-${segment.id}-translations`;
	const translations = translationsForLocale(segment, locale);
	const content = (
		<>
			<header className="mb-5">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
					{isAnnotation ? labels.annotation : labels.passage}
				</p>
				<h2
					className="mt-2 text-xl font-semibold text-slate-950"
					id={headingId}
				>
					{isAnnotation ? labels.annotation : labels.source}
				</h2>
			</header>

			{sourceVisible ? (
				<p
					className="whitespace-pre-wrap font-serif text-lg leading-[2.2] text-slate-900 sm:text-xl"
					lang={sourceLocale}
				>
					{segment.sourceText}
				</p>
			) : null}

			{translationsVisible ? (
				<section
					aria-labelledby={translationHeadingId}
					className="mt-7 border-t border-slate-100 pt-5"
				>
					<h3
						className="text-lg font-semibold text-slate-950"
						id={translationHeadingId}
					>
						{labels.translations}
					</h3>
					{translations.length === 0 ? (
						<div
							className="mt-4 rounded-xl border border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-600"
							role="status"
						>
							{labels.noTranslations}
						</div>
					) : (
						<ol aria-label={labels.translations} className="mt-4 space-y-4">
							{translations.map((candidate, index) => (
								<TranslationCandidateCard
									authenticated={authenticated}
									candidate={candidate}
									key={candidate.id}
									locale={locale}
									onVote={onVote}
									position={index + 1}
								/>
							))}
						</ol>
					)}
				</section>
			) : null}

			{onCreateTranslation ? (
				<div className="mt-7 border-t border-slate-100 pt-5">
					<TranslationForm
						authenticated={authenticated}
						availableLocales={availableLocales}
						defaultLocale={locale}
						fieldIdPrefix={`translation-${segment.id}`}
						onCreateTranslation={(input) =>
							onCreateTranslation({ ...input, segmentId: segment.id })
						}
						uiLocale={locale}
					/>
				</div>
			) : null}
		</>
	);

	return isAnnotation ? (
		<aside
			aria-label={labels.annotation}
			aria-labelledby={headingId}
			className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 sm:p-6"
		>
			{content}
		</aside>
	) : (
		<section
			aria-labelledby={headingId}
			className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-7"
		>
			{content}
		</section>
	);
}

export function ScriptureReader({
	detail,
	authenticated,
	onVote,
	locale = detail.displayLocale ?? "ja",
	onCreateTranslation,
	createTranslationJob,
	getTranslationJob,
}: ScriptureReaderProps) {
	const labels = getCopy(locale);
	const [readingMode, setReadingMode] = useState<ReadingMode>("both");
	const selectedLocale = detail.displayLocale ?? locale;
	const sourceVisible = readingMode !== "translation";
	const translationsVisible = readingMode !== "source";
	const availableLocales = detail.availableLocales ?? [
		{ code: selectedLocale, label: selectedLocale },
	];
	const segments =
		detail.segments.length > 0
			? detail.segments
			: [
					{
						id: detail.primarySegmentId ?? `${detail.id}-source`,
						kind: "PRIMARY" as const,
						position: 0,
						sourceText: detail.sourceText,
						translations: detail.translations,
					},
				];
	const primarySegments = segments.filter(
		(segment) => segment.kind === "PRIMARY",
	);
	const annotationsByMainSegment = new Map<string, ScriptureSegment[]>();
	for (const link of detail.annotationLinks) {
		const annotation = segments.find(
			(segment) => segment.id === link.annotationSegmentId,
		);
		if (!annotation) continue;
		const annotations = annotationsByMainSegment.get(link.mainSegmentId) ?? [];
		annotations.push(annotation);
		annotationsByMainSegment.set(link.mainSegmentId, annotations);
	}
	const displaySegments: ScriptureSegment[] = [];
	const displayedSegmentIds = new Set<string>();
	for (const primary of primarySegments) {
		displaySegments.push(primary);
		displayedSegmentIds.add(primary.id);
		for (const annotation of annotationsByMainSegment.get(primary.id) ?? []) {
			if (displayedSegmentIds.has(annotation.id)) continue;
			displaySegments.push(annotation);
			displayedSegmentIds.add(annotation.id);
		}
	}
	for (const segment of segments) {
		if (displayedSegmentIds.has(segment.id)) continue;
		displaySegments.push(segment);
		displayedSegmentIds.add(segment.id);
	}

	return (
		<article className="mx-auto max-w-6xl pb-16 text-slate-900">
			<ScriptureBreadcrumbs
				items={detail.hierarchy.map((label) => ({ label }))}
			/>

			<header className="mb-8 border-b border-slate-200 pb-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="mb-3 text-sm font-semibold tracking-[0.2em] text-slate-500">
						{labels.sectionLabel}
					</p>
					<LanguageSwitcher
						currentLocale={selectedLocale}
						hrefForLocale={(nextLocale) => `/${nextLocale}/${detail.slug}`}
						locales={availableLocales}
					/>
				</div>
				<h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					{detail.title}
				</h1>
				{detail.paliTitle ? (
					<p className="mt-2 text-base text-slate-500" lang="pi">
						{detail.paliTitle}
					</p>
				) : null}
			</header>

			<fieldset className="mb-8 flex flex-wrap items-center gap-2">
				<legend className="mr-1 text-sm font-medium text-slate-600">
					{labels.mode}
				</legend>
				{(
					[
						["both", labels.both],
						["source", labels.sourceOnly],
						["translation", labels.translationOnly],
					] as const
				).map(([mode, label]) => (
					<button
						aria-pressed={readingMode === mode}
						className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
							readingMode === mode
								? "border-slate-900 bg-slate-900 text-white"
								: "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50"
						}`}
						key={mode}
						onClick={() => setReadingMode(mode)}
						type="button"
					>
						{label}
					</button>
				))}
			</fieldset>

			<div className="space-y-6">
				{displaySegments.map((segment) => (
					<SegmentReading
						authenticated={authenticated}
						availableLocales={availableLocales}
						key={segment.id}
						locale={selectedLocale}
						onCreateTranslation={onCreateTranslation}
						onVote={onVote}
						segment={segment}
						sourceLocale={detail.sourceLocale ?? "pi"}
						sourceVisible={sourceVisible}
						translationsVisible={translationsVisible}
					/>
				))}
			</div>

			{createTranslationJob && getTranslationJob ? (
				<div className="mt-8">
					<AiTranslationJob
						authenticated={authenticated}
						createTranslationJob={createTranslationJob}
						getTranslationJob={getTranslationJob}
						locale={selectedLocale}
						scriptureId={detail.id}
					/>
				</div>
			) : null}
		</article>
	);
}
