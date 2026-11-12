import useSWR from "swr";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { FollowButtonClient } from "@/app/[locale]/(common-layout)/[handle]/_components/follow-button/client";

export function ProfileFollowIsland({
	locale,
	userId,
}: {
	locale: string;
	userId: string;
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
	if (session?.user.id === userId) return null;
	if (session?.user && !data) return null;
	return (
		<FollowButtonClient
			isFollowing={data?.isFollowing ?? false}
			locale={locale}
			targetUserId={userId}
		/>
	);
}
