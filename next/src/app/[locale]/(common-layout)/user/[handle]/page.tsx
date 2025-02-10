import { PageCard } from "@/app/[locale]/components/page-card";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/db/queries.server";
import { fetchUserByHandle } from "@/app/db/queries.server";
import { auth } from "@/auth";
import { NavigationLink } from "@/components/navigation-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Card } from "@/components/ui/card";
import { getGuestId } from "@/lib/get-guest-id";
import Linkify from "linkify-react";
import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { isFollowing } from "./components/follow-button/db/queries.server";
import { FollowButton } from "./components/follow-button/follow-button";
import { FollowStats } from "./components/follow-stats";
import { PaginationControls } from "./components/pagination-controls";
import {
	fetchFollowerList,
	fetchFollowingList,
	getFollowCounts,
} from "./db/queries.server";
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
	const { handle } = await params;
	if (!handle) {
		return { title: "Profile" };
	}
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return { title: "Not Found" };
	}
	return { title: pageOwner.name };
}

export default async function UserPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string; handle: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { locale, handle } = await params;
	const { page = "1" } = await searchParams;
	if (typeof handle !== "string" || typeof page !== "string") {
		throw new Error("Invalid handle or page");
	}

	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		throw new Response("Not Found", { status: 404 });
	}

	const pageSize = 9;

	const session = await auth();
	const currentUser = session?.user;
	const guestId = !currentUser ? await getGuestId() : undefined;

	const isOwner = currentUser?.handle === handle;

	const { pagesWithInfo, totalPages, currentPage } =
		await fetchPaginatedPublicPagesWithInfo({
			page: Number(page),
			pageSize,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			pageOwnerId: pageOwner.id,
			onlyUserOwn: true,
			locale,
		});
	if (!pagesWithInfo) throw new Response("Not Found", { status: 404 });
	const followCounts = await getFollowCounts(pageOwner.id);
	const followerList = await fetchFollowerList(pageOwner.id);
	const followingList = await fetchFollowingList(pageOwner.id);
	const isCurrentUserFollowing = currentUser?.id
		? await isFollowing(currentUser.id, pageOwner.id)
		: false;

	return (
		<div>
			<Card className="mb-8">
				<CardHeader className="pb-4">
					<div className="flex w-full flex-col md:flex-row">
						<div>
							<NavigationLink href={`${pageOwner.image}`}>
								<Avatar className="w-20 h-20 md:w-24 md:h-24">
									<AvatarImage src={pageOwner.image} alt={pageOwner.name} />
									<AvatarFallback>
										{pageOwner.name.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</NavigationLink>
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
								<NavigationLink href={`/user/${pageOwner.handle}/edit`}>
									<Button
										variant="secondary"
										className="flex items-center rounded-full"
									>
										<Settings className="w-4 h-4" />
										<span className="ml-2 text-sm">Edit Profile</span>
									</Button>
								</NavigationLink>
							) : (
								<FollowButton
									targetUserId={pageOwner.id}
									isFollowing={isCurrentUserFollowing}
									className="rounded-full"
								/>
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

			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{pagesWithInfo.map((page) => (
					<PageCard
						key={page.id}
						pageCard={page}
						pageLink={`/user/${pageOwner.handle}/page/${page.slug}`}
						userLink={`/user/${pageOwner.handle}`}
						showOwnerActions={isOwner}
					/>
				))}
			</div>

			{pagesWithInfo.length > 0 && (
				<div className="mt-8 flex justify-center">
					<PaginationControls
						currentPage={currentPage}
						totalPages={totalPages}
					/>
				</div>
			)}

			{pagesWithInfo.length === 0 && (
				<p className="text-center text-gray-500 mt-10">
					{isOwner ? "You haven't created any pages yet." : "No pages yet."}
				</p>
			)}
		</div>
	);
}
