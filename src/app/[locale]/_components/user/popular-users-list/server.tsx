import { getImageProps } from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@/i18n/routing';
import { fetchPopularUsers } from './_db/queries.server';

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
        const imageSrc = user.image?.trim();
        const { props } = getImageProps({
          src: imageSrc,
          alt: user.name,
          width: 40,
          height: 40,
        });

        return (
          <Link
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
            href={`/user/${user.handle}`}
            key={user.id}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage {...props} />
              <AvatarFallback>
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground text-sm">@{user.handle}</p>
            </div>
            <div className="ml-auto text-muted-foreground text-xs">
              {user._count.followers} followers
            </div>
          </Link>
        );
      })}
    </div>
  );
}
