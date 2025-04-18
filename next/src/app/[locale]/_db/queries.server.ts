import { prisma } from "@/lib/prisma";

export function createUserSelectFields() {
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
	};
}

export async function getPageById(pageId: number) {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
	});
	return page;
}

export async function getProjectById(projectId: string) {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});
	return project;
}

export async function fetchLatestProjectAITranslationInfo(projectId: string) {
	const locales = await prisma.projectAITranslationInfo.findMany({
		where: { projectId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.projectAITranslationInfo.findFirst({
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
