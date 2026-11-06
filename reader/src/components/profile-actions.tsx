import { Settings } from "lucide-react";
import useSWR from "swr";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { FollowButtonClient } from "@/app/[locale]/(common-layout)/[handle]/_components/follow-button/client";
import { Button } from "@/components/ui/button";

export function ProfileActionsIsland({
	locale,
	handle,
	userId,
	editLabel,
}: {
	locale: string;
	handle: string;
	userId: string;
	editLabel: string;
}) {
	const { data: session, isPending } = authClient.useSession();
	const hydrated = useHydrated();
	const { data } = useSWR(
		session?.user.id && session.user.id !== userId
			? ["follow-state", userId, session.user.id]
			: null,
		async () => {
			const response = await fetch(
				`/api/reader-state?targetUserId=${encodeURIComponent(userId)}`,
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return response.json() as Promise<{ isFollowing: boolean }>;
		},
	);
	if (!hydrated || isPending) return null;
	if (session?.user.handle === handle)
		return (
			<Button
				asChild
				className="flex items-center rounded-full"
				variant="secondary"
			>
				<a href={`/${locale}/${handle}/edit`}>
					<Settings className="w-4 h-4" />
					<span className="ml-2 text-sm">{editLabel}</span>
				</a>
			</Button>
		);
	if (session?.user && !data) return null;
	return (
		<FollowButtonClient
			isFollowing={data?.isFollowing ?? false}
			locale={locale}
			targetUserId={userId}
		/>
	);
}
