import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SourceLocaleBridge } from "@/app/_context/source-locale-bridge.client";
import { PageContent } from "./_components/page-content";
import { fetchPageContext } from "./_lib/fetch-page-context";
import { generatePageMetadata } from "./_lib/generate-page-metadata";

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
	const { pageSlug, locale } = await props.params;
	const data = await fetchPageContext(pageSlug, locale);
	if (!data) return notFound();
	const { pageDetail } = data;

	// Public route only renders PUBLIC pages
	if (pageDetail.status !== "PUBLIC") {
		return notFound();
	}

	return (
		<>
			<SourceLocaleBridge locale={pageDetail.sourceLocale} />
			<PageContent locale={locale} pageData={data} />
		</>
	);
}
