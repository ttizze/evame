import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getScriptureCopy } from "./copy";
import { LanguageSwitcher } from "./language-switcher";
import { buildLoginHref } from "./login-link";
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
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	createTranslationJob?: CreateTranslationJob;
	getTranslationJob?: GetTranslationJob;
};

type ReadingMode = "both" | "source" | "translation";

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
	onDeleteTranslation,
	onVote,
	segment,
	sourceLocale,
	translationsVisible,
	sourceVisible,
	loginHref,
}: {
	authenticated: boolean;
	availableLocales: Array<{ code: string; label: string }>;
	locale: string;
	onCreateTranslation?: CreateTranslation;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	onVote: SubmitTranslationVote;
	segment: ScriptureSegment;
	sourceLocale: string;
	translationsVisible: boolean;
	sourceVisible: boolean;
	loginHref: string;
}) {
	const labels = getScriptureCopy(locale);
	const isAnnotation = segment.kind === "COMMENTARY";
	const headingId = `segment-${segment.id}-title`;
	const translationHeadingId = `segment-${segment.id}-translations`;
	const translations = translationsForLocale(segment, locale);
	const [showAllTranslations, setShowAllTranslations] = useState(false);
	const bestTranslation = translations[0];
	const alternativeTranslations = translations.slice(1);
	const displayedTranslations = bestTranslation
		? [
				bestTranslation,
				...(showAllTranslations
					? alternativeTranslations
					: alternativeTranslations.slice(0, 3)),
			]
		: [];
	const hasMoreTranslations = alternativeTranslations.length > 3;
	const content = (
		<>
			<header className="mb-5">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
					{isAnnotation ? labels.annotation : labels.passage}
				</p>
				<h2 className="mt-2 text-xl font-semibold" id={headingId}>
					{isAnnotation ? labels.annotation : labels.source}
				</h2>
			</header>

			{sourceVisible ? (
				<p
					className="whitespace-pre-wrap font-serif text-lg leading-[2.2] sm:text-xl"
					lang={sourceLocale}
				>
					{segment.sourceText}
				</p>
			) : null}

			{translationsVisible ? (
				<section
					aria-labelledby={translationHeadingId}
					className="mt-7 border-t pt-5"
				>
					<h3 className="text-lg font-semibold" id={translationHeadingId}>
						{labels.translations}
					</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						{labels.translationDescription}
					</p>
					{translations.length === 0 ? (
						<div
							className="mt-4 border-y border-dashed px-5 py-7 text-center text-sm text-muted-foreground"
							role="status"
						>
							{labels.noTranslations}
						</div>
					) : (
						<>
							{alternativeTranslations.length > 0 ? (
								<p className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
									<Languages aria-hidden="true" className="h-4 w-4" />
									{labels.otherTranslations}
								</p>
							) : null}
							<ol
								aria-label={labels.translations}
								className="mt-4"
								id={`segment-${segment.id}-translation-list`}
							>
								{displayedTranslations.map((candidate, index) => (
									<TranslationCandidateCard
										authenticated={authenticated}
										candidate={candidate}
										key={candidate.id}
										locale={locale}
										loginHref={loginHref}
										onDeleteTranslation={onDeleteTranslation}
										onVote={onVote}
										position={index + 1}
									/>
								))}
							</ol>
							{hasMoreTranslations ? (
								<Button
									aria-controls={`segment-${segment.id}-translation-list`}
									aria-expanded={showAllTranslations}
									className="mt-2 w-full text-sm"
									onClick={() => setShowAllTranslations((visible) => !visible)}
									type="button"
									variant="link"
								>
									{showAllTranslations ? (
										<ChevronUp aria-hidden="true" className="mr-1 h-4 w-4" />
									) : (
										<ChevronDown aria-hidden="true" className="mr-1 h-4 w-4" />
									)}
									{showAllTranslations ? labels.collapse : labels.showAll}
								</Button>
							) : null}
						</>
					)}
				</section>
			) : null}

			{onCreateTranslation ? (
				<div className="mt-7 border-t pt-5">
					<TranslationForm
						authenticated={authenticated}
						availableLocales={availableLocales}
						defaultLocale={locale}
						fieldIdPrefix={`translation-${segment.id}`}
						loginHref={loginHref}
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
			className="ml-4 border-l pl-4 text-muted-foreground sm:ml-6 sm:pl-6"
		>
			{content}
		</aside>
	) : (
		<section
			aria-labelledby={headingId}
			className="border-b pb-8 last:border-b-0"
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
	onDeleteTranslation,
	createTranslationJob,
	getTranslationJob,
}: ScriptureReaderProps) {
	const labels = getScriptureCopy(locale);
	const [readingMode, setReadingMode] = useState<ReadingMode>("both");
	const selectedLocale = detail.displayLocale ?? locale;
	const sourceVisible = readingMode !== "translation";
	const translationsVisible = readingMode !== "source";
	const availableLocales = detail.availableLocales ?? [
		{ code: selectedLocale, label: selectedLocale },
	];
	const loginHref = buildLoginHref(
		selectedLocale,
		`/${selectedLocale}/${detail.slug}`,
	);
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
		<article className="mx-auto w-full max-w-4xl pb-16">
			<ScriptureBreadcrumbs
				items={detail.hierarchy.map((label) => ({ label }))}
				locale={selectedLocale}
			/>

			<header className="mb-8 border-b pb-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="mb-3 text-sm font-semibold tracking-[0.2em] text-muted-foreground">
						{labels.sectionLabel}
					</p>
					<LanguageSwitcher
						currentLocale={selectedLocale}
						hrefForLocale={(nextLocale) => `/${nextLocale}/${detail.slug}`}
						locales={availableLocales}
					/>
				</div>
				<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
					{detail.title}
				</h1>
				{detail.paliTitle ? (
					<p className="mt-2 text-base text-muted-foreground" lang="pi">
						{detail.paliTitle}
					</p>
				) : null}
			</header>

			<fieldset className="mb-8 flex flex-wrap items-center gap-2">
				<legend className="mr-1 text-sm font-medium text-muted-foreground">
					{labels.mode}
				</legend>
				{(
					[
						["both", labels.both],
						["source", labels.sourceOnly],
						["translation", labels.translationOnly],
					] as const
				).map(([mode, label]) => (
					<Button
						aria-pressed={readingMode === mode}
						key={mode}
						onClick={() => setReadingMode(mode)}
						size="sm"
						type="button"
						variant={readingMode === mode ? "default" : "outline"}
					>
						{label}
					</Button>
				))}
			</fieldset>

			<div className="space-y-6">
				{displaySegments.map((segment) => (
					<SegmentReading
						authenticated={authenticated}
						availableLocales={availableLocales}
						key={segment.id}
						locale={selectedLocale}
						loginHref={loginHref}
						onCreateTranslation={onCreateTranslation}
						onDeleteTranslation={onDeleteTranslation}
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
						loginHref={loginHref}
						scriptureId={detail.id}
					/>
				</div>
			) : null}
		</article>
	);
}
