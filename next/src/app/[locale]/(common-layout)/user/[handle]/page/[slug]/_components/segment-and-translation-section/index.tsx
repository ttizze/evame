"use client";
import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { SegmentWithTranslations } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { Lock } from "lucide-react";
import { SquarePen } from "lucide-react";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { TranslationSection } from "./translation-section";
interface SegmentAndTranslationSectionProps {
	segmentWithTranslations: SegmentWithTranslations;
	elements: string | ReactNode | ReactNode[];
	showLockIcon?: boolean;
	segmentTextClassName?: string;
	currentHandle: string | undefined;
	isOwner?: boolean;
	slug?: string;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export function SegmentAndTranslationSection({
	segmentWithTranslations,
	elements,
	showLockIcon = false,
	segmentTextClassName,
	currentHandle,
	isOwner,
	slug,
	voteTarget,
	addTranslationFormTarget,
}: SegmentAndTranslationSectionProps) {
	const [showOriginal] = useQueryState("showOriginal", {
		parse: (val) => val === "true",
		serialize: (val) => (val ? "true" : "false"),
		defaultValue: true,
	});
	const [showTranslation] = useQueryState("showTranslation", {
		parse: (val) => val === "true",
		serialize: (val) => (val ? "true" : "false"),
		defaultValue: true,
	});
	return (
		<span className="flex flex-col">
			{showOriginal && (
				<span
					className={`inline-block ${
						segmentWithTranslations.segmentTranslationsWithVotes.length === 0 ||
						!showTranslation
							? "text-gray-700 dark:text-gray-200 [&>a]:text-gray-700 dark:[&>a]:text-gray-200 [&>strong]:text-gray-700 dark:[&>strong]:text-gray-200"
							: "text-gray-300 dark:text-gray-600 [&>a]:text-gray-300 dark:[&>a]:text-gray-600 [&>strong]:text-gray-300 dark:[&>strong]:text-gray-600"
					} ${segmentTextClassName}`}
				>
					{showLockIcon && <Lock className="h-6 w-6 mr-1 inline" />}
					{isOwner && slug && (
						<div className="ml-2">
							<Link href={`/user/${currentHandle}/page/${slug}/edit`}>
								<SquarePen className="w-5 h-5" />
							</Link>
						</div>
					)}
					{elements}
				</span>
			)}
			{showTranslation &&
				segmentWithTranslations.segmentTranslationsWithVotes.length > 0 && (
					<TranslationSection
						key={`translation-${segmentWithTranslations.segment.id}`}
						segmentWithTranslations={segmentWithTranslations}
						currentHandle={currentHandle}
						voteTarget={voteTarget}
						addTranslationFormTarget={addTranslationFormTarget}
					/>
				)}
		</span>
	);
}
