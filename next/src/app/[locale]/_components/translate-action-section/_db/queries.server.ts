import { prisma } from "@/lib/prisma";

export async function fetchPageTranslationInfo(pageSlug: string) {
	return await prisma.page.findUnique({
		where: { slug: pageSlug },
		select: { sourceLocale: true, translationJobs: true },
	});
}

export async function fetchProjectTranslationInfo(projectSlug: string) {
	return await prisma.project.findUnique({
		where: { slug: projectSlug },
		select: { sourceLocale: true, translationJobs: true },
	});
}
