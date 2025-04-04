import { getCurrentUser } from "@/auth";
import { redirect } from "next/navigation";
import ProjectManagement from "./_components/project-management";
import { fetchProjectsWithRelationsByUserId } from "./_db/queries.server";
interface ProjectManagementPageProps {
	params: {
		handle: string;
		locale: string;
	};
}

export default async function ProjectManagementPage({
	params,
}: ProjectManagementPageProps) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return redirect("/auth/login");
	}
	const { handle, locale } = await params;

	const projects = await fetchProjectsWithRelationsByUserId(currentUser.id);

	return (
		<div className="container py-8">
			<ProjectManagement
				projects={projects}
				locale={locale}
				userId={currentUser.id}
				userHandle={currentUser.handle}
			/>
		</div>
	);
}
