import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SourceLocaleBridge } from "@/app/_context/source-locale-bridge.client";
import { createServerLogger } from "@/lib/logger.server";
import { PageContent } from "./_components/page-content";
import { generatePageMetadata } from "./_lib/generate-page-metadata";
import { fetchPageContext } from "./_service/fetch-page-context";

const logger = createServerLogger("page-view");

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

// Force static rendering for this route (no dynamic APIs allowed)
export const dynamic = "force-static";
// Optionally enable ISR; adjust as needed
// Revalidate once per month (30 days = 2,592,000 seconds)
export const revalidate = 2592000;

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
		isPreview: false,
	});
}

export default async function Page(
	props: PageProps<"/[locale]/user/[handle]/page/[pageSlug]">,
) {
	const { pageSlug, locale, handle } = await props.params;
	const data = await fetchPageContext(pageSlug, locale);
	if (!data) {
		logger.warn({ pageSlug, locale, handle }, "Page context not found");
		return notFound();
	}
	const { pageDetail } = data;

	// Public route only renders PUBLIC pages
	if (pageDetail.status !== "PUBLIC") {
		logger.warn(
			{
				pageSlug,
				status: pageDetail.status,
				pageId: pageDetail.id,
				handle,
			},
			"Page status is not PUBLIC",
		);
		return notFound();
	}

	return (
		<>
			<SourceLocaleBridge locale={pageDetail.sourceLocale} />
			<PageContent locale={locale} pageData={data} />
		</>
	);
}
