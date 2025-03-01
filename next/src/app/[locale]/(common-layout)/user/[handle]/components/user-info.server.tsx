import { fetchUserByHandle } from "@/app/db/queries.server";
import { getCurrentUser } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import Linkify from "linkify-react";
import { Settings } from "lucide-react";
import { getImageProps } from "next/image";
import {
	fetchFollowerList,
	fetchFollowingList,
	getFollowCounts,
} from "../db/queries.server";
import { FollowButton } from "./follow-button";
import { FollowStats } from "./follow-stats";

export async function UserInfo({
	handle,
}: {
	handle: string;
}) {
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		const error = new Error("Unauthorized");
		error.message = "Unauthorized";
		throw error;
	}
	const { props } = getImageProps({
		src: pageOwner.image,
		alt: pageOwner.name,
		width: 100,
		height: 100,
	});

	const currentUser = await getCurrentUser();

	const isOwner = currentUser?.handle === handle;

	const followCounts = await getFollowCounts(pageOwner.id);
	const followerList = await fetchFollowerList(pageOwner.id);
	const followingList = await fetchFollowingList(pageOwner.id);

	return (
		<Card className="mb-8">
			<CardHeader className="pb-4">
				<div className="flex w-full flex-col md:flex-row">
					<div>
						<Link href={`${pageOwner.image}`}>
							<Avatar className="w-20 h-20 md:w-24 md:h-24">
								<AvatarImage {...props} />
								<AvatarFallback>
									{pageOwner.name.charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</Link>
					</div>
					<div className="mt-2 md:mt-0 md:ml-4 flex items-center justify-between w-full">
						<div>
							<CardTitle className="text-xl md:text-2xl font-bold">
								{pageOwner.name}
							</CardTitle>
							<div>
								<CardDescription className="text-sm text-gray-500">
									@{pageOwner.handle}
								</CardDescription>
								<FollowStats
									followingCount={followCounts.following}
									followersCount={followCounts.followers}
									followingList={followingList.map((item) => ({
										handle: item.following.handle,
										name: item.following.name,
										image: item.following.image,
									}))}
									followerList={followerList.map((item) => ({
										handle: item.follower.handle,
										name: item.follower.name,
										image: item.follower.image,
									}))}
								/>
							</div>
						</div>

						{isOwner ? (
							<Link href={`/user/${pageOwner.handle}/edit`}>
								<Button
									variant="secondary"
									className="flex items-center rounded-full"
								>
									<Settings className="w-4 h-4" />
									<span className="ml-2 text-sm">Edit Profile</span>
								</Button>
							</Link>
						) : (
							<FollowButton targetUserId={pageOwner.id} />
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="mt-4">
				<Linkify options={{ className: "underline" }}>
					{pageOwner.profile}
				</Linkify>
			</CardContent>
		</Card>
	);
}
