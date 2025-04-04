import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
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
	const { handle, id } = params;

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
	const { handle, id, locale } = params;
	// Fetch the project
	const project = await fetchProjectWithRelations(id);

	if (!project) {
		notFound();
	}

	return (
		<div className="container max-w-4xl py-8">
			<ProjectForm project={project} locale={locale} userHandle={handle} />
		</div>
	);
}
