import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

export async function updateUser(
	userId: string,
	data: {
		name: string;
		handle: string;
		profile: string | undefined;
		twitterHandle: string | undefined;
	},
) {
	const [updatedUser] = await db
		.update(users)
		.set(data)
		.where(eq(users.id, userId))
		.returning({
			id: users.id,
			handle: users.handle,
			name: users.name,
			image: users.image,
			emailVerified: users.emailVerified,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
			profile: users.profile,
			twitterHandle: users.twitterHandle,
			totalPoints: users.totalPoints,
			isAI: users.isAI,
			plan: users.plan,
		});
	return updatedUser;
}

export async function updateUserImage(userId: string, imageUrl: string) {
	const [updatedUser] = await db
		.update(users)
		.set({ image: imageUrl })
		.where(eq(users.id, userId))
		.returning({
			id: users.id,
			handle: users.handle,
			name: users.name,
			image: users.image,
			emailVerified: users.emailVerified,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
			profile: users.profile,
			twitterHandle: users.twitterHandle,
			totalPoints: users.totalPoints,
			isAI: users.isAI,
			plan: users.plan,
		});
	return updatedUser;
}
