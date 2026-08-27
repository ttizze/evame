"use client";

import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import { buildLoginHref } from "@/components/scripture/login-link";
import type {
	CreateTranslation,
	CreateTranslationJob,
	GetTranslationJob,
	ScriptureDetail,
	ScriptureSegment,
	SubmitTranslationVote,
} from "@/components/scripture/types";
import { Button } from "@/components/ui/button";
import { AiTranslationJob } from "./translation-job";
import { AddAndVoteTranslations } from "./translation-section/add-and-vote-translations.client";

type ContentWithTranslationsProps = {
	authenticated: boolean;
	detail: ScriptureDetail;
	locale: string;
	onCreateTranslation?: CreateTranslation;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	onVote: SubmitTranslationVote;
	createTranslationJob?: CreateTranslationJob;
	getTranslationJob?: GetTranslationJob;
};

type ReadingMode = "both" | "source" | "translation";

function readReadingMode(): ReadingMode {
	if (typeof window === "undefined") return "both";
	const view = new URLSearchParams(window.location.search).get("view");
	return view === "source"
		? "source"
		: view === "user"
			? "translation"
			: "both";
}

function writeReadingMode(mode: ReadingMode) {
	if (typeof window === "undefined") return;
	const view =
		mode === "source" ? "source" : mode === "translation" ? "user" : "both";
	const url = new URL(window.location.href);
	url.searchParams.set("view", view);
	window.history.replaceState(window.history.state, "", url);
	window.dispatchEvent(
		new CustomEvent("scripture-view-change", { detail: view }),
	);
}

function translationsForLocale(segment: ScriptureSegment, locale: string) {
	const localized = segment.translations.filter(
		(candidate) => candidate.locale,
	);
	return localized.length === 0
		? segment.translations
		: segment.translations.filter((candidate) => candidate.locale === locale);
}

function SegmentContent({
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
					<ClientOnly fallback={null}>
						<AddAndVoteTranslations
							authenticated={authenticated}
							availableLocales={availableLocales}
							defaultLocale={locale}
							locale={locale}
							loginHref={loginHref}
							onCreateTranslation={
								onCreateTranslation
									? (input) =>
											onCreateTranslation({ ...input, segmentId: segment.id })
									: undefined
							}
							onDeleteTranslation={onDeleteTranslation}
							onVote={onVote}
							open={true}
							translations={translations}
						/>
					</ClientOnly>
				</section>
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

function displaySegments(detail: ScriptureDetail): ScriptureSegment[] {
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

	const result: ScriptureSegment[] = [];
	const displayedSegmentIds = new Set<string>();
	for (const primary of primarySegments) {
		result.push(primary);
		displayedSegmentIds.add(primary.id);
		for (const annotation of annotationsByMainSegment.get(primary.id) ?? []) {
			if (displayedSegmentIds.has(annotation.id)) continue;
			result.push(annotation);
			displayedSegmentIds.add(annotation.id);
		}
	}
	for (const segment of segments) {
		if (displayedSegmentIds.has(segment.id)) continue;
		result.push(segment);
		displayedSegmentIds.add(segment.id);
	}
	return result;
}

export function ContentWithTranslations({
	authenticated,
	detail,
	locale,
	onCreateTranslation,
	onDeleteTranslation,
	onVote,
	createTranslationJob,
	getTranslationJob,
}: ContentWithTranslationsProps) {
	const labels = getScriptureCopy(locale);
	const [readingMode, setReadingMode] = useState<ReadingMode>(readReadingMode);

	useEffect(() => {
		const updateFromView = (event: Event) => {
			const value = (event as CustomEvent<string>).detail;
			setReadingMode(
				value === "source"
					? "source"
					: value === "user"
						? "translation"
						: "both",
			);
		};
		const updateFromPopState = () => setReadingMode(readReadingMode());
		window.addEventListener("scripture-view-change", updateFromView);
		window.addEventListener("popstate", updateFromPopState);
		return () => {
			window.removeEventListener("scripture-view-change", updateFromView);
			window.removeEventListener("popstate", updateFromPopState);
		};
	}, []);
	const sourceVisible = readingMode !== "translation";
	const translationsVisible = readingMode !== "source";
	const selectedLocale = detail.displayLocale ?? locale;
	const availableLocales = detail.availableLocales ?? [
		{ code: selectedLocale, label: selectedLocale },
	];
	const scripturePath = detail.ownerHandle
		? `/${selectedLocale}/${detail.ownerHandle}/${detail.slug}`
		: `/${selectedLocale}`;
	const loginHref = buildLoginHref(selectedLocale, scripturePath);

	return (
		<>
			<h1 className="mb-0! ">{detail.title}</h1>
			{detail.paliTitle ? (
				<p className="mt-2 text-base text-muted-foreground" lang="pi">
					{detail.paliTitle}
				</p>
			) : null}
			<div className="not-prose mb-8 flex flex-wrap items-center gap-2">
				<span className="mr-1 text-sm font-medium text-muted-foreground">
					{labels.mode}
				</span>
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
						onClick={() => {
							setReadingMode(mode);
							writeReadingMode(mode);
						}}
						size="sm"
						type="button"
						variant={readingMode === mode ? "default" : "outline"}
					>
						{label}
					</Button>
				))}
			</div>
			<div className="js-content space-y-6">
				{displaySegments(detail).map((segment) => (
					<SegmentContent
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
		</>
	);
}
