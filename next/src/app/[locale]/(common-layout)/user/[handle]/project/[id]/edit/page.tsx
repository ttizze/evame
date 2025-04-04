import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { fetchProjectWithRelations } from "../_db/queries.server";
import { ProjectForm } from "./_components/project-form";
interface ProjectEditPageProps {
	params: {
		handle: string;
		id: string;
		locale: string;
	};
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
	if (!currentUser || currentUser.handle !== handle) {
		return redirect("/auth/login");
	}
	const project = await fetchProjectWithRelations(id);
	if (!project) {
		return notFound();
	}

	return (
		<div className="container max-w-4xl py-8">
			<ProjectForm project={project} userHandle={handle} />
		</div>
	);
}
