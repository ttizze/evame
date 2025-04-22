"use client";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TranslationJob } from "@prisma/client";
import { TranslationStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
type UserAITranslationStatusProps = {
	latestUserTranslationJob: TranslationJob | null;
};

export function UserAITranslationStatus({
	latestUserTranslationJob,
}: UserAITranslationStatusProps) {
	const router = useRouter();
	useEffect(() => {
		if (
			!latestUserTranslationJob ||
			latestUserTranslationJob.status === TranslationStatus.COMPLETED
		) {
			return;
		}
		const intervalId = setInterval(() => {
			router.refresh();
		}, 3000);
		return () => clearInterval(intervalId);
	}, [latestUserTranslationJob, router]);

	return (
		<div className="h-[15px] flex mt-1 items-center space-y-1">
			{latestUserTranslationJob ? (
				<>
					<Progress
						value={latestUserTranslationJob.progress}
						className={cn(
							"grow",
							latestUserTranslationJob.status ===
								TranslationStatus.IN_PROGRESS && "bg-blue-400 animate-pulse",
							latestUserTranslationJob.status === TranslationStatus.FAILED &&
								"bg-red-400",
						)}
						indicatorClassName="bg-gray-400"
					/>
					<div className="flex items-center whitespace-nowrap ml-2">
						<span className="text-xs text-gray-500 mr-1">
							{Math.round(latestUserTranslationJob.progress)}
						</span>
						<span className="text-xs text-gray-500">
							{latestUserTranslationJob.status}
						</span>
					</div>
				</>
			) : null}
		</div>
	);
}
