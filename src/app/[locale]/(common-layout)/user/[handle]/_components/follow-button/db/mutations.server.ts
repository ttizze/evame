import { prisma } from '@/lib/prisma';

export async function createFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error('Follower and following cannot be the same');
  }
  const followingUser = await prisma.user.findUnique({
    where: {
      id: followingId,
    },
  });
  const followerUser = await prisma.user.findUnique({
    where: {
      id: followerId,
    },
  });
  if (!(followerUser && followingUser)) {
    throw new Error('User not found');
  }
  return await prisma.follow.create({
    data: {
      followerId: followerUser.id,
      followingId: followingUser.id,
    },
  });
}

export async function deleteFollow(followerId: string, followingId: string) {
  const followerUser = await prisma.user.findUnique({
    where: {
      id: followerId,
    },
  });
  const followingUser = await prisma.user.findUnique({
    where: {
      id: followingId,
    },
  });
  if (!(followerUser && followingUser)) {
    throw new Error('User not found');
  }
  return await prisma.follow.delete({
    where: {
      followerId_followingId: {
        followerId: followerUser.id,
        followingId: followingUser.id,
      },
    },
  });
}

export async function createNotificationFollow(
  actorId: string,
  userId: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'FOLLOW',
        actorId,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error in createNotificationFollow:', error);
    throw error;
  }
}
