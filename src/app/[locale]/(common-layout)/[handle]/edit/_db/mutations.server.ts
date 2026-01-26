import { db } from "@/db";

export async function updateUser(
	userId: string,
	data: {
		name: string;
		handle: string;
		profile: string | undefined;
		twitterHandle: string | undefined;
	},
) {
	const updatedUser = await db
		.updateTable("users")
		.set(data)
		.where("id", "=", userId)
		.returning([
			"id",
			"handle",
			"name",
			"image",
			"emailVerified",
			"createdAt",
			"updatedAt",
			"profile",
			"twitterHandle",
			"totalPoints",
			"isAi as isAI",
			"plan",
		])
		.executeTakeFirst();
	return updatedUser;
}

export async function updateUserImage(userId: string, imageUrl: string) {
	const updatedUser = await db
		.updateTable("users")
		.set({ image: imageUrl })
		.where("id", "=", userId)
		.returning([
			"id",
			"handle",
			"name",
			"image",
			"emailVerified",
			"createdAt",
			"updatedAt",
			"profile",
			"twitterHandle",
			"totalPoints",
			"isAi as isAI",
			"plan",
		])
		.executeTakeFirst();
	return updatedUser;
}
