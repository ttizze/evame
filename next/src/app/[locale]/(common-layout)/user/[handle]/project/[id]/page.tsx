import { fetchProjectDetail } from "@/app/[locale]/_db/project-queries.server";
import { mdastToText } from "@/app/[locale]/_lib/mdast-to-text";
import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import ProjectDetailSkeleton from "./_components/project-detail-skeleton";
import { fetchProjectMetaData } from "./_db/queries.server";

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

const DynamicProjectCommentForm = dynamic(() =>
	import("./_components/comment/_components/project-comment-form/client").then(
		(mod) => mod.ProjectCommentForm,
	),
);

const DynamicProjectCommentList = dynamic(() =>
	import("./_components/comment/_components/project-comment-list/server").then(
		(mod) => mod.ProjectCommentList,
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

	const project = await fetchProjectMetaData(id);

	if (!project || project.user.handle !== handle) {
		return {
			title: "Project Not Found",
		};
	}
	const description = await mdastToText(project.mdastJson).then((text) =>
		text.slice(0, 200),
	);
	return {
		title: `${project.title} | ${project.user.name}`,
		description,
		openGraph: {
			type: "article",
			title: `${project.title} | ${project.user.name}`,
			description,
			images: [{ url: project.iconImage?.url ?? "", width: 1200, height: 630 }],
		},
	};
}

export default async function ProjectPage({ params }: ProjectPageProps) {
	const { id, locale, handle } = await params;
	const currentUser = await getCurrentUser();
	const projectDetail = await fetchProjectDetail(id, locale);
	if (!projectDetail) {
		return notFound();
	}

	return (
		<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
			<DynamicProject projectDetail={projectDetail} locale={locale} />
			<div className="py-4">
				<UserInfo handle={projectDetail.user.handle} />
			</div>
			<div className="flex items-center gap-4">
				<DynamicProjectLikeButton projectId={projectDetail.id} showCount />
				<MessageCircle className="w-6 h-6" strokeWidth={1.5} />
				<span>{projectDetail._count?.projectLikes || 0}</span>
			</div>

			<DynamicFloatingControls
				likeButton={
					<DynamicProjectLikeButton
						projectId={projectDetail.id}
						showCount={false}
						className="w-10 h-10 border rounded-full"
					/>
				}
			/>

			<div className="mt-8">
				<div className="mt-8" id="comments">
					<div className="flex items-center gap-2 py-2">
						<h2 className="text-2xl not-prose font-bold">Comments</h2>
					</div>
					<DynamicProjectCommentList
						projectId={projectDetail.id}
						userLocale={locale}
					/>
				</div>
				<DynamicProjectCommentForm
					projectId={projectDetail.id}
					currentHandle={currentUser?.handle}
					userLocale={locale}
				/>
			</div>
		</article>
	);
}
