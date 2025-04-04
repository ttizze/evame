import { ProjectForm } from "../[id]/edit/_components/project-form";

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
	const { handle, locale } = params;

	return (
		<div className="container max-w-4xl py-8">
			<div className="space-y-6">
				<ProjectForm locale={locale} userHandle={handle} />
			</div>
		</div>
	);
}
