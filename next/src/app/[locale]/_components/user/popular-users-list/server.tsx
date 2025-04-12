import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { getImageProps } from "next/image";
import { fetchPopularUsers } from "./_db/queries.server";

interface PopularUsersListProps {
	limit: number;
}

export default async function PopularUsersList({
	limit,
}: PopularUsersListProps) {
	// Fetch popular users based on follower count
	const popularUsers = await fetchPopularUsers(limit);

	if (popularUsers.length === 0) {
		return <p className="text-muted-foreground">No users found</p>;
	}

	return (
		<div className="space-y-4">
			{popularUsers.map((user) => {
				const { props } = getImageProps({
					src: user.image,
					alt: user.name,
					width: 40,
					height: 40,
				});

				return (
					<Link
						href={`/user/${user.handle}`}
						key={user.id}
						className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
					>
						<Avatar className="w-10 h-10">
							<AvatarImage {...props} />
							<AvatarFallback>
								{user.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="font-medium">{user.name}</p>
							<p className="text-sm text-muted-foreground">@{user.handle}</p>
						</div>
						<div className="ml-auto text-xs text-muted-foreground">
							{user._count.followers} followers
						</div>
					</Link>
				);
			})}
		</div>
	);
}
