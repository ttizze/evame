import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BASE_URL } from "@/app/_constants/base-url";
import { fetchPageOgData } from "@/app/_db/fetch-page-og.server";
import { getCurrentUser } from "@/app/_service/auth-server";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import { ContentWithTranslations } from "./_components/content-with-translations";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; handle: string; pageSlug: string }>;
}): Promise<Metadata> {
	const { pageSlug, locale } = await params;
	const page = await fetchPageOgData(pageSlug, locale);
	if (!page) return notFound();
	const ogImageUrl = `${BASE_URL}/${locale}/opengraph-image-8p799s`;

	return {
		title: page.title,
		openGraph: {
			title: page.title,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title: page.title,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
	};
}

export default async function Page({
	params,
}: PageProps<"/[locale]/[handle]/[pageSlug]">) {
	const { pageSlug, locale } = await params;
	const pageDetail = await fetchPageDetail(pageSlug, locale);
	if (!pageDetail) {
		return notFound();
	}

	const isDraft = pageDetail.status !== "PUBLIC";
	if (isDraft) {
		const currentUser = await getCurrentUser();
		if (!currentUser || currentUser.handle !== pageDetail.userHandle) {
			return notFound();
		}
	}

	return (
		<article className="mx-auto mb-20 w-full prose lg:prose-lg dark:prose-invert">
			<ContentWithTranslations pageDetail={pageDetail} />
		</article>
	);
}
