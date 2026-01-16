import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/_service/auth-server";
import { PageContent } from "../_components/page-content";
import { PreviewBanner } from "../_components/preview-banner";
import { fetchPageContext } from "../_service/fetch-page-context";
import { generatePageMetadata } from "../_service/generate-page-metadata";

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

// Preview route is always dynamic and non-cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { pageSlug, locale } = await params;
	const data = await fetchPageContext(pageSlug, locale);
	if (!data) return notFound();

	return generatePageMetadata({
		pageData: data,
		locale,
		pageSlug,
		isPreview: true,
	});
}

export default async function PreviewPage(
	props: PageProps<"/[locale]/user/[handle]/page/[pageSlug]/preview">,
) {
	const { pageSlug, locale, handle } = await props.params;

	// Only owner can preview
	const currentUser = await getCurrentUser();
	if (!currentUser || currentUser.handle !== handle) {
		return notFound();
	}

	const data = await fetchPageContext(pageSlug, locale);
	if (!data) return notFound();

	return (
		<>
			<PreviewBanner />
			<PageContent locale={locale} pageData={data} />
		</>
	);
}
