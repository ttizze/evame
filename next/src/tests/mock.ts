import { PageStatus } from "@prisma/client";

export const mockUsers = [
	{
		id: "mockUserId1",
		handle: "mockUserId1",
		profile: "mockUserId1",
		createdAt: new Date(),
		updatedAt: new Date(),
		totalPoints: 0,
		isAI: false,
		name: "mockUserId1",
		image: "mockUserId1",
	},
	{
		id: "mockUserId2",
		handle: "mockUserId2",
		profile: "mockUserId2",
		createdAt: new Date(),
		updatedAt: new Date(),
		totalPoints: 0,
		isAI: false,
		name: "mockUserId2",
		image: "mockUserId2",
	},
];

export const mockPages = [
	{
		id: 1,
		userId: "mockUserId1",
		content: "test",
		slug: "mockUserId1-page1",
		sourceLocale: "en",
		status: PageStatus.PUBLIC,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		id: 2,
		userId: "mockUserId2",
		content: "test",
		slug: "mockUserId2-page1",
		sourceLocale: "en",
		status: PageStatus.PUBLIC,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		id: 3,
		userId: "mockUserId1",
		content: "test",
		slug: "mockUserId1-page2-draft",
		sourceLocale: "en",
		status: PageStatus.DRAFT,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
];
