import { mdastToHtml } from "@/app/[locale]/_lib/mdast-to-html";
import { getCurrentUser } from "@/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EditPageClient } from "./_components/edit-page-client";
import {
	getAllTagsWithCount,
	getPageWithTitleAndTagsBySlug,
} from "./_db/queries.server";
type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

const getPageData = cache(async (handle: string, pageSlug: string) => {
	if (!handle || !pageSlug) notFound();

	const currentUser = await getCurrentUser();
	if (currentUser?.handle !== handle) {
		return notFound();
	}
	const [pageWithTitleAndTags, allTagsWithCount] = await Promise.all([
		getPageWithTitleAndTagsBySlug(pageSlug),
		getAllTagsWithCount(),
	]);
	const title = pageWithTitleAndTags?.pageSegments.find(
		(pageSegment) => pageSegment.number === 0,
	)?.text;
	return {
		currentUser,
		pageWithTitleAndTags,
		allTagsWithCount,
		title,
	};
});

export async function generateMetadata({
	params,
}: { params: Params }): Promise<Metadata> {
	const { handle, pageSlug } = await params;
	const { title } = await getPageData(handle, pageSlug);

	return {
		title: title ? `Edit ${title}` : "Edit Page",
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default async function EditPage({
	params,
}: {
	params: Params;
}) {
	const { locale, handle, pageSlug } = await params;
	const { currentUser, pageWithTitleAndTags, allTagsWithCount, title } =
		await getPageData(handle, pageSlug);
	const { html } = await mdastToHtml({
		mdastJson: pageWithTitleAndTags?.mdastJson ?? {},
	});

	return (
		<EditPageClient
			currentUser={currentUser}
			pageWithTitleAndTags={pageWithTitleAndTags}
			allTagsWithCount={allTagsWithCount}
			initialTitle={title}
			pageSlug={pageSlug}
			userLocale={locale}
			html={html}
		/>
	);
}
