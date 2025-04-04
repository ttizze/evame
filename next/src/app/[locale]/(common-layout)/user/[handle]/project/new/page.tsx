import { getCurrentUser } from "@/auth";
import { redirect } from "next/navigation";
import { ProjectForm } from "../[id]/edit/_components/project-form";
import { fetchAllProjectTags } from "../[id]/edit/_db/tag-queries.server";

interface NewProjectPageProps {
	params: {
		handle: string;
		locale: string;
	};
}

export async function generateMetadata({ params }: NewProjectPageProps) {
	const { locale } = params;

	return {
		title: "Create New Project",
		description: "Create a new project",
	};
}

export default async function NewProjectPage({ params }: NewProjectPageProps) {
	const { handle } = params;
	const currentUser = await getCurrentUser();
	if (!currentUser || currentUser.handle !== handle) {
		return redirect("/auth/login");
	}

	const allProjectTags = await fetchAllProjectTags();

	return (
		<div className="container max-w-4xl py-8">
			<ProjectForm userHandle={handle} allProjectTags={allProjectTags} />
		</div>
	);
}
