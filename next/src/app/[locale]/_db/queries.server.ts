import { prisma } from "@/lib/prisma";

export const selectUserFields = () => {
	return {
		id: true,
		name: true,
		handle: true,
		image: true,
		createdAt: true,
		updatedAt: true,
		profile: true,
		twitterHandle: true,
		totalPoints: true,
		isAI: true,
	} as const;
};

export async function getPageById(pageId: number) {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		include: {
			user: {
				select: selectUserFields(),
			},
		},
	});
	return page;
}

export async function getProjectById(projectId: number) {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});
	return project;
}

export async function fetchLatestProjectTranslationJob(projectId: number) {
	const locales = await prisma.translationJob.findMany({
		where: { projectId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.translationJob.findFirst({
				where: {
					projectId,
					locale,
				},
				orderBy: { createdAt: "desc" },
			}),
		),
	);

	// nullでないレコードのみを返す
	return results.filter((record) => record !== null);
}
