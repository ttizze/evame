import { Link } from "@tanstack/react-router";
import Linkify from "linkify-react";
import { Settings } from "lucide-react";
import { BASE_URL } from "@/app/_constants/base-url";
import { ProfilePageJsonLd } from "@/components/seo/json-ld";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProfilePageData } from "../_service/profile";
import { FollowButtonClient } from "./follow-button/client";
import { FollowStats } from "./follow-stats";

export function UserInfo({
	data,
	locale,
}: {
	data: ProfilePageData;
	locale: string;
}) {
	const { pageOwner } = data;
	const profileUrl = `${BASE_URL}/${locale}/${pageOwner.handle}`;
	const avatar = (
		<Avatar className="w-20 h-20 md:w-24 md:h-24 not-prose">
			<AvatarImage alt={pageOwner.name} src={pageOwner.image || undefined} />
			<AvatarFallback>{pageOwner.name.charAt(0).toUpperCase()}</AvatarFallback>
		</Avatar>
	);

	return (
		<>
			<ProfilePageJsonLd
				description={pageOwner.profile || undefined}
				image={pageOwner.image || undefined}
				name={pageOwner.name}
				url={profileUrl}
			/>
			<div className="mb-8 py-4">
				<div className="pb-4">
					<div className="flex w-full flex-col md:flex-row">
						<div>
							{pageOwner.image ? (
								<a href={pageOwner.image} rel="noreferrer" target="_blank">
									{avatar}
								</a>
							) : (
								avatar
							)}
						</div>
						<div className="mt-2 md:mt-0 md:ml-4 flex items-center justify-between w-full">
							<div>
								<p className="text-xl md:text-2xl font-bold not-prose">
									{pageOwner.name}
								</p>
								<div>
									<p className="text-sm text-gray-500 not-prose">
										@{pageOwner.handle}
									</p>
									<FollowStats
										followerList={data.followerList}
										followersCount={data.followCounts.followers}
										followingCount={data.followCounts.following}
										followingList={data.followingList}
										locale={locale}
									/>
								</div>
							</div>

							{data.isOwner ? (
								<Link
									params={{ handle: pageOwner.handle, locale }}
									to="/$locale/$handle/edit"
								>
									<Button
										className="flex items-center rounded-full"
										variant="secondary"
									>
										<Settings className="w-4 h-4" />
										<span className="ml-2 text-sm">Edit Profile</span>
									</Button>
								</Link>
							) : (
								<FollowButtonClient
									isFollowing={data.isFollowing}
									locale={locale}
									targetUserId={pageOwner.id}
								/>
							)}
						</div>
					</div>
				</div>

				<div className="mt-4">
					<Linkify options={{ className: "underline" }}>
						{pageOwner.profile}
					</Linkify>
					<div className="flex items-center gap-2 mt-6">
						{pageOwner.twitterHandle && (
							<a
								href={`https://x.com/${pageOwner.twitterHandle}`}
								rel="noreferrer"
								target="_blank"
							>
								<img
									alt="X"
									className="dark:invert"
									height={20}
									src="/x.svg"
									width={20}
								/>
							</a>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
