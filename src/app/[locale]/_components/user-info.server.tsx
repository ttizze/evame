import Linkify from 'linkify-react';
import { Settings } from 'lucide-react';
import Image, { getImageProps } from 'next/image';
import { notFound } from 'next/navigation';
import { fetchUserByHandle } from '@/app/_db/queries.server';
import { getCurrentUser } from '@/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { FollowButton } from '../(common-layout)/user/[handle]/_components/follow-button';
import { FollowStats } from '../(common-layout)/user/[handle]/_components/follow-stats';
import {
  fetchFollowerList,
  fetchFollowingList,
  getFollowCounts,
} from '../(common-layout)/user/[handle]/_db/queries.server';
export async function UserInfo({ handle }: { handle: string }) {
  const pageOwner = await fetchUserByHandle(handle);
  if (!pageOwner) {
    return notFound();
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
    <div className="mb-8 py-4">
      <div className="pb-4">
        <div className="flex w-full flex-col md:flex-row">
          <div>
            <Link href={`${pageOwner.image}`}>
              <Avatar className="not-prose h-20 w-20 md:h-24 md:w-24">
                <AvatarImage {...props} />
                <AvatarFallback>
                  {pageOwner.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
          <div className="mt-2 flex w-full items-center justify-between md:mt-0 md:ml-4">
            <div>
              <p className="not-prose font-bold text-xl md:text-2xl">
                {pageOwner.name}
              </p>
              <div>
                <p className="not-prose text-gray-500 text-sm">
                  @{pageOwner.handle}
                </p>
                <FollowStats
                  followerList={followerList.map((item) => ({
                    handle: item.follower.handle,
                    name: item.follower.name,
                    image: item.follower.image,
                  }))}
                  followersCount={followCounts.followers}
                  followingCount={followCounts.following}
                  followingList={followingList.map((item) => ({
                    handle: item.following.handle,
                    name: item.following.name,
                    image: item.following.image,
                  }))}
                />
              </div>
            </div>

            {isOwner ? (
              <Link href={`/user/${pageOwner.handle}/edit`}>
                <Button
                  className="flex items-center rounded-full"
                  variant="secondary"
                >
                  <Settings className="h-4 w-4" />
                  <span className="ml-2 text-sm">Edit Profile</span>
                </Button>
              </Link>
            ) : (
              <FollowButton targetUserId={pageOwner.id} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Linkify options={{ className: 'underline' }}>
          {pageOwner.profile}
        </Linkify>
        <div className="mt-6 flex items-center gap-2">
          {pageOwner.twitterHandle && (
            <Link
              href={`https://x.com/${pageOwner.twitterHandle}`}
              target="_blank"
            >
              <Image
                alt="X"
                className="dark:invert"
                height={20}
                src="/x.svg"
                width={20}
              />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
