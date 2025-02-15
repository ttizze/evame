"use client";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UserAITranslationInfo } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
type UserAITranslationStatusProps = {
	userAITranslationInfo: UserAITranslationInfo | null;
};

export function UserAITranslationStatus({
	userAITranslationInfo,
}: UserAITranslationStatusProps) {
	const router = useRouter();
	useEffect(() => {
		if (
			!userAITranslationInfo ||
			userAITranslationInfo?.aiTranslationStatus === "COMPLETED"
		) {
			return;
		}
		const intervalId = setInterval(() => {
			router.refresh();
		}, 3000);
		return () => clearInterval(intervalId);
	}, [userAITranslationInfo, router]);

	return (
		<div className="h-[15px] flex mt-1 items-center space-y-1">
			{userAITranslationInfo ? (
				<>
					<Progress
						value={userAITranslationInfo.aiTranslationProgress}
						className={cn(
							"flex-grow",
							userAITranslationInfo.aiTranslationStatus === "IN_PROGRESS" &&
								"bg-blue-400 animate-pulse",
							userAITranslationInfo.aiTranslationStatus === "FAILED" &&
								"bg-red-400",
						)}
						indicatorClassName="bg-gray-400"
					/>
					<div className="flex items-center whitespace-nowrap ml-2">
						<span className="text-xs text-gray-500 mr-1">
							{Math.round(userAITranslationInfo.aiTranslationProgress)}
						</span>
						<span className="text-xs text-gray-500">
							{userAITranslationInfo.aiTranslationStatus}
						</span>
					</div>
				</>
			) : null}
		</div>
	);
}
