import { EyeIcon, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { BASE_URL } from "@/app/_constants/base-url";
import { SourceLocaleBridge } from "@/app/_context/source-locale-bridge.client";
import { mdastToText } from "@/app/[locale]/_lib/mdast-to-text";
import { PageCommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/server";
import { Skeleton } from "@/components/ui/skeleton";
import { buildAlternateLocales } from "./_lib/build-alternate-locales";
import { fetchPageContext } from "./_lib/fetch-page-context";

const DynamicContentWithTranslations = dynamic(
	() =>
		import("./_components/content-with-translations").then(
			(mod) => mod.ContentWithTranslations,
		),
	{
		loading: () => <Skeleton className="h-[500px] w-full" />,
	},
);
const DynamicPageLikeButton = dynamic(
	() =>
		import("@/app/[locale]/_components/page/page-like-button/server").then(
			(mod) => mod.PageLikeButton,
		),
	{
		loading: () => <span>Loading LikeButton...</span>,
	},
);

const DynamicFloatingControls = dynamic(
	() =>
		import("../../../../../_components/floating-controls.client").then(
			(mod) => mod.FloatingControls,
		),
	{
		loading: () => <span>Loading Controls...</span>,
	},
);

const DynamicPageCommentForm = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-form/client"
		).then((mod) => mod.PageCommentForm),
	{
		loading: () => <p>Loading Comment Form...</p>,
	},
);

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

export async function generateMetadata({
	params,
}: {
	params: Params;
	searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
	const { pageSlug, locale } = await params;
	const data = await fetchPageContext(pageSlug, locale);
	if (!data) {
		return {
			title: "Page Not Found",
		};
	}
	const { pageDetail, pageTranslationJobs, title } = data;

	const description = await mdastToText(pageDetail.mdastJson).then((text) =>
		text.slice(0, 200),
	);
	const ogImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${pageSlug}`;
	return {
		title,
		description,
		openGraph: {
			type: "article",
			title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		alternates: {
			languages: buildAlternateLocales(
				pageDetail,
				pageTranslationJobs,
				pageDetail.user.handle,
				locale,
			),
		},
	};
}

export default async function Page({
	params,
}: {
	params: Params;
	searchParams: Promise<SearchParams>;
}) {
	const { pageSlug, locale } = await params;
	const data = await fetchPageContext(pageSlug, locale);
	if (!data) {
		return notFound();
	}
	const { pageDetail, currentUser, pageViewCount } = data;

	const isOwner = pageDetail.user.handle === currentUser?.handle;
	if (!isOwner && pageDetail.status !== "PUBLIC") {
		return notFound();
	}
	return (
		<>
			<SourceLocaleBridge locale={pageDetail.sourceLocale} />
			<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
				<DynamicContentWithTranslations pageData={data} />
				<div className="flex items-center gap-4">
					<EyeIcon className="w-5 h-5" strokeWidth={1.5} />
					<span className="text-muted-foreground">{pageViewCount}</span>
					<DynamicPageLikeButton
						pageId={pageDetail.id}
						pageSlug={pageDetail.slug}
						ownerHandle={pageDetail.user.handle}
						showCount
					/>
					<MessageCircle className="w-5 h-5" strokeWidth={1.5} />
					<span className="text-muted-foreground">
						{pageDetail._count?.pageComments || 0}
					</span>
				</div>

				<DynamicFloatingControls
					likeButton={
						<DynamicPageLikeButton
							pageId={pageDetail.id}
							pageSlug={pageDetail.slug}
							ownerHandle={pageDetail.user.handle}
							showCount={false}
							className="w-10 h-10 border rounded-full"
						/>
					}
				/>

				{pageDetail.children && pageDetail.children.length > 0 && (
					<div className="mt-8 p-4 border rounded-lg">
						<h2 className="text-xl font-bold mb-4">子ページ</h2>
						<ul className="space-y-2">
							{pageDetail.children.map((child) => (
								<li key={child.id}>
									<a
										href={`/${locale}/user/${child.user.handle}/page/${child.slug}`}
										className="text-blue-600 hover:underline"
									>
										{child.segmentBundles[0]?.segment.text || "Untitled"}
									</a>
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="mt-8">
					<div className="mt-8" id="comments">
						<div className="flex items-center gap-2 py-2">
							<h2 className="text-2xl not-prose font-bold">Comments</h2>
						</div>
						<PageCommentList pageId={pageDetail.id} userLocale={locale} />
					</div>
					<DynamicPageCommentForm
						pageId={pageDetail.id}
						currentHandle={currentUser?.handle}
						userLocale={locale}
					/>
				</div>
			</article>
		</>
	);
}
