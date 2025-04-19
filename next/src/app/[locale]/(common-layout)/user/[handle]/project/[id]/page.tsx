import { fetchProjectDetail } from "@/app/[locale]/_db/project-queries.server";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import ProjectDetailSkeleton from "./_components/project-detail-skeleton";
const UserInfo = dynamic(
	() =>
		import("@/app/[locale]/_components/user-info.server").then(
			(mod) => mod.UserInfo,
		),
	{
		loading: () => <Skeleton className="w-full h-10" />,
	},
);
const DynamicProject = dynamic(
	() =>
		import("./_components/project-detail.server").then((mod) => mod.Project),
	{
		loading: () => <ProjectDetailSkeleton />,
	},
);
const DynamicFloatingControls = dynamic(() =>
	import("@/app/[locale]/_components/floating-controls.client").then(
		(mod) => mod.FloatingControls,
	),
);
const DynamicProjectLikeButton = dynamic(() =>
	import("@/app/[locale]/_components/project/project-like-button/server").then(
		(mod) => mod.ProjectLikeButton,
	),
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

	const projectDetail = await fetchProjectDetail(id, locale);
	if (!projectDetail) {
		return notFound();
	}
	return (
		<div className="container max-w-4xl py-8">
			<DynamicProject projectDetail={projectDetail} locale={locale} />
			<div className="py-4">
				<UserInfo handle={projectDetail.user.handle} />
			</div>
			<DynamicFloatingControls
				likeButton={
					<DynamicProjectLikeButton
						projectId={projectDetail.id}
						showCount={false}
						className="w-12 h-12 border rounded-full"
					/>
				}
				shareTitle={projectDetail.title}
			/>
		</div>
	);
}
