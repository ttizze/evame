import type { UserAITranslationInfo } from "@prisma/client";
import { useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/utils/cn";

type UserAITranslationStatusProps = {
	userAITranslationInfo: UserAITranslationInfo | null;
};

export function UserAITranslationStatus({
	userAITranslationInfo,
}: UserAITranslationStatusProps) {
	const revalidator = useRevalidator();
	useEffect(() => {
		if (
			!userAITranslationInfo ||
			userAITranslationInfo?.aiTranslationStatus === "COMPLETED"
		) {
			return;
		}
		const intervalId = setInterval(revalidator.revalidate, 3000);
		return () => clearInterval(intervalId);
	}, [userAITranslationInfo, revalidator]);

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
