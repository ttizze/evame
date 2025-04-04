import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProjectDetail from "./_components/project-detail";
import ProjectDetailSkeleton from "./_components/project-detail-skeleton";
import { fetchProjectWithRelations } from "./_db/queries.server";

interface ProjectPageProps {
	params: {
		handle: string;
		id: string;
		locale: string;
	};
}

export async function generateMetadata({ params }: ProjectPageProps) {
	const { handle, id } = await params;

	const project = await prisma.project.findUnique({
		where: { id },
		include: { user: true },
	});

	if (!project || project.user.handle !== handle) {
		return {
			title: "Project Not Found",
		};
	}

	return {
		title: `${project.title} | ${project.user.name}`,
		description: project.description,
	};
}

export default async function ProjectPage({ params }: ProjectPageProps) {
	const { handle, id, locale } = await params;

	// 新規作成モードの判定
	const isCreateMode = id === "new";

	// 編集モードの場合のみデータをフェッチ
	const project = !isCreateMode ? await fetchProjectWithRelations(id) : null;

	// 編集モードで、プロジェクトが見つからない場合
	if (!isCreateMode && !project) {
		notFound();
	}

	return (
		<div className="container max-w-4xl py-8">
			<Suspense fallback={<ProjectDetailSkeleton />}>
				<ProjectDetail project={project} locale={locale} />
			</Suspense>
		</div>
	);
}
