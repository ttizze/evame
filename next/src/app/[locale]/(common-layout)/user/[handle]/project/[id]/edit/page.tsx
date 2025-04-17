import { fetchProjectWithTranslations } from "@/app/[locale]/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import ProjectEditSkeleton from "./_components/project-edit-skeleton";
const ProjectForm = dynamic(
	() => import("./_components/project-form").then((mod) => mod.ProjectForm),
	{
		loading: () => <ProjectEditSkeleton />,
	},
);
import { fetchAllProjectTags } from "./_db/queries.server";

interface ProjectEditPageProps {
	params: Promise<{
		handle: string;
		id: string;
		locale: string;
	}>;
}

export async function generateMetadata({ params }: ProjectEditPageProps) {
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
		title: `Edit: ${project.title} | ${project.user.name}`,
		description: `Edit project: ${project.title}`,
	};
}

export default async function ProjectEditPage({
	params,
}: ProjectEditPageProps) {
	const { handle, id } = await params;
	const currentUser = await getCurrentUser();
	if (!currentUser?.id || currentUser.handle !== handle) {
		return redirect("/auth/login");
	}

	const [project, allProjectTags] = await Promise.all([
		fetchProjectWithTranslations(id, currentUser?.id),
		fetchAllProjectTags(),
	]);

	if (!project) {
		return notFound();
	}

	return (
		<div className="flex justify-center py-8">
			<ProjectForm
				project={project}
				userHandle={handle}
				allProjectTags={allProjectTags}
			/>
		</div>
	);
}
