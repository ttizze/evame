import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import ProjectDetailSkeleton from "./_components/project-detail-skeleton";
import { fetchProjectWithRelations } from "./_db/queries.server";
const UserInfo = dynamic(
	() =>
		import("@/app/[locale]/_components/user-info.server").then(
			(mod) => mod.UserInfo,
		),
	{
		loading: () => <Skeleton className="w-full h-10" />,
	},
);
const ProjectDetail = dynamic(
	() => import("./_components/project-detail").then((mod) => mod.ProjectDetail),
	{
		loading: () => <ProjectDetailSkeleton />,
	},
);
interface ProjectPageProps {
	params: Promise<{
		handle: string;
		id: string;
		locale: string;
	}>;
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
	const { id, locale } = await params;

	const project = await fetchProjectWithRelations(id);
	if (!project) {
		return notFound();
	}
	return (
		<div className="container max-w-4xl py-8">
			<ProjectDetail project={project} locale={locale} />
			<div className="py-4">
				<UserInfo handle={project.user.handle} />
			</div>
		</div>
	);
}
