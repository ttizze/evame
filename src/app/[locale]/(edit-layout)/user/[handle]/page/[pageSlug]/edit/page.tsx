import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_service/auth-server";
import { mdastToHtml } from "@/app/[locale]/_domain/mdast-to-html";
import { EditPageClient } from "./_components/edit-page-client";
import {
	getAllTagsWithCount,
	getPageWithTitleAndTagsBySlug,
	getTranslationContextsByUserId,
	getUserTargetLocales,
} from "./_db/queries.server";

export const metadata: Metadata = {
	title: "Edit Page",
	robots: {
		index: false,
		follow: false,
	},
};

export default function EditPage({
	params,
}: PageProps<"/[locale]/user/[handle]/page/[pageSlug]/edit">) {
	return (
		<Suspense fallback={null}>
			{params.then(async ({ locale, handle, pageSlug }) => {
				if (!handle || !pageSlug) notFound();

				const currentUser = await getCurrentUser();
				if (currentUser?.handle !== handle || !currentUser?.id) {
					return notFound();
				}

				const [
					pageWithTitleAndTags,
					allTagsWithCount,
					targetLocales,
					translationContexts,
				] = await Promise.all([
					getPageWithTitleAndTagsBySlug(pageSlug),
					getAllTagsWithCount(),
					getUserTargetLocales(currentUser.id),
					getTranslationContextsByUserId(currentUser.id),
				]);

				const { html } = await mdastToHtml({
					mdastJson: pageWithTitleAndTags?.mdastJson ?? null,
				});

				return (
					<EditPageClient
						allTagsWithCount={allTagsWithCount}
						currentUser={currentUser}
						html={html}
						initialTitle={pageWithTitleAndTags?.segments[0].text}
						pageSlug={pageSlug}
						pageWithTitleAndTags={pageWithTitleAndTags}
						targetLocales={targetLocales}
						translationContexts={translationContexts}
						userLocale={locale}
					/>
				);
			})}
		</Suspense>
	);
}
