import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { createLoader, parseAsString } from "nuqs/server";
import type React from "react";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

const NewPageList = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/_components/page/new-page-list/server"
		),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

import { ArrowRightIcon } from "lucide-react";
import AboutSection from "@/app/[locale]/(common-layout)/_components/about-section/server";

const NewPageListByTag = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/server"
		),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "Evame — 言葉の壁がないインターネット",
			description:
				"母国語で書く。世界が読む。Evameは言葉の壁を越えて、あなたの記事を世界に届けます。",
		},
		en: {
			title: "Evame — Internet Without Language Barriers",
			description:
				"Write in your language. The world reads. Evame breaks language barriers to share your articles globally.",
		},
		zh: {
			title: "Evame — 没有语言障碍的互联网",
			description:
				"用母语写作，世界阅读。Evame打破语言壁垒，将您的文章传递给全世界。",
		},
		ko: {
			title: "Evame — 언어 장벽 없는 인터넷",
			description:
				"모국어로 쓰세요. 세계가 읽습니다. Evame은 언어의 벽을 넘어 당신의 글을 세계에 전달합니다.",
		},
		es: {
			title: "Evame — Internet Sin Barreras Idiomáticas",
			description:
				"Escribe en tu idioma. El mundo lee. Evame rompe las barreras del idioma para compartir tus artículos globalmente.",
		},
	};

export async function generateMetadata(
	props: PageProps<"/[locale]">,
): Promise<Metadata> {
	const { locale } = await props.params;
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/"),
	};
}

const searchParamsSchema = {
	tab: parseAsString.withDefault("home"),
	sort: parseAsString.withDefault("popular"),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function HomePage(
	props: PageProps<"/[locale]">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;
	await loadSearchParams(props.searchParams);
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			<AboutSection locale={locale} topPage={true} />
			<NewPageList
				locale={locale}
				searchParams={props.searchParams}
				showPagination={false}
			/>
			<div className="flex justify-center">
				<Button className="rounded-full w-40 h-10" variant="default">
					<Link className="flex items-center gap-2" href="/new-pages">
						More <ArrowRightIcon className="w-4 h-4" />
					</Link>
				</Button>
			</div>

			<NewPageListByTag locale={locale} tagName="AI" />
			<div className="flex justify-center">
				<Button className="rounded-full w-40 h-10" variant="default">
					<Link className="flex items-center gap-2" href="/tag/AI">
						More <ArrowRightIcon className="w-4 h-4" />
					</Link>
				</Button>
			</div>

			<NewPageListByTag locale={locale} tagName="Programming" />
			<div className="flex justify-center">
				<Button className="rounded-full w-40 h-10" variant="default">
					<Link className="flex items-center gap-2" href="/tag/Programming">
						More <ArrowRightIcon className="w-4 h-4" />
					</Link>
				</Button>
			</div>

			<NewPageListByTag locale={locale} tagName="Plurality" />
			<div className="flex justify-center">
				<Button className="rounded-full w-40 h-10" variant="default">
					<Link className="flex items-center gap-2" href="/tag/Plurality">
						More <ArrowRightIcon className="w-4 h-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
