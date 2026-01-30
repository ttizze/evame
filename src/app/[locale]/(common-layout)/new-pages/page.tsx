import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type React from "react";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import { Skeleton } from "@/components/ui/skeleton";

const NewPageList = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/_components/page/new-page-list/server"
		),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "新着記事 | Evame",
			description:
				"Evameの最新記事をチェック。世界中のライターが投稿した多言語コンテンツ。",
		},
		en: {
			title: "New Pages | Evame",
			description:
				"Browse the latest articles on Evame. Multilingual content from writers around the world.",
		},
		zh: {
			title: "最新文章 | Evame",
			description: "浏览Evame上的最新文章。来自世界各地作者的多语言内容。",
		},
		ko: {
			title: "새 글 | Evame",
			description:
				"Evame의 최신 기사를 확인하세요. 전 세계 작가들의 다국어 콘텐츠.",
		},
		es: {
			title: "Nuevos Artículos | Evame",
			description:
				"Explora los últimos artículos en Evame. Contenido multilingüe de escritores de todo el mundo.",
		},
	};

export async function generateMetadata(
	props: PageProps<"/[locale]/new-pages">,
): Promise<Metadata> {
	const { locale } = await props.params;
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/new-pages"),
	};
}

export default async function NewPagesPage(
	props: PageProps<"/[locale]/new-pages">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;
	return (
		<div className="flex flex-col gap-8 mb-12">
			<NewPageList
				locale={locale}
				searchParams={props.searchParams}
				showPagination={true}
			/>
		</div>
	);
}
