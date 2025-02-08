import { getCurrentUser } from "@/auth";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EditPageClient } from "./components/edit-page-client";
import { getAllTags, getPageBySlug } from "./db/queries.server";

type Props = {
	params: {
		handle: string;
		slug: string;
		locale: string;
	};
};

export const getPageData = cache(async (handle: string, slug: string) => {
	if (!handle || !slug) notFound();

	const currentUser = await getCurrentUser();
	if (currentUser?.handle !== handle) {
		throw new Response("Unauthorized", { status: 403 });
	}
	const [pageWithTitleAndTags, allTags] = await Promise.all([
		getPageBySlug(slug),
		getAllTags(),
	]);
	const title = pageWithTitleAndTags?.pageSegments.find(
		(pageSegment) => pageSegment.number === 0,
	)?.text;
	return {
		currentUser,
		pageWithTitleAndTags,
		allTags,
		title,
	};
});

export async function generateMetadata(
	{ params }: Props,
	parent: ResolvingMetadata,
): Promise<Metadata> {
	const resolvedParams = await params;
	const { title } = await getPageData(
		resolvedParams.handle,
		resolvedParams.slug,
	);

	return {
		title: title ? `Edit ${title}` : "Edit Page",
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default async function EditPage({ params }: Props) {
	const resolvedParams = await params;
	const { currentUser, pageWithTitleAndTags, allTags, title } =
		await getPageData(resolvedParams.handle, resolvedParams.slug);

	return (
		<EditPageClient
			currentUser={currentUser}
			pageWithTitleAndTags={pageWithTitleAndTags}
			allTags={allTags}
			initialTitle={title}
			slug={resolvedParams.slug}
		/>
	);
}
