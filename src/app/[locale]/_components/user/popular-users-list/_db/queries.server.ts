import { prisma } from '@/lib/prisma';

interface PopularUser {
  id: string;
  name: string;
  handle: string;
  image: string;
  _count: {
    followers: number;
  };
}

/**
 * Fetches popular users based on follower count
 * @param limit Maximum number of users to return
 * @returns Array of popular users with follower count
 */
export async function fetchPopularUsers(limit: number): Promise<PopularUser[]> {
  return prisma.user.findMany({
    take: limit,
    orderBy: {
      followers: {
        _count: 'desc',
      },
    },
    select: {
      id: true,
      name: true,
      handle: true,
      image: true,
      _count: {
        select: {
          followers: true,
        },
      },
    },
  });
}
