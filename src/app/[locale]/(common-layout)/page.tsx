import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import AboutSection from "@/app/[locale]/(common-layout)/_components/about-section/server";
import NewPageList from "@/app/[locale]/(common-layout)/_components/page/new-page-list/server";
import PopularPageList from "@/app/[locale]/(common-layout)/_components/page/popular-page-list/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

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

function SectionSkeleton({ className }: { className: string }) {
	return <Skeleton className={className} />;
}

export default function HomePage({
	params,
}: PageProps<"/[locale]">): ReactNode {
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			<Suspense fallback={<SectionSkeleton className="h-[480px] w-full" />}>
				{params.then(({ locale }) => (
					<AboutSection locale={locale} topPage={true} />
				))}
			</Suspense>
			<Suspense fallback={<SectionSkeleton className="h-[400px] w-full" />}>
				{params.then(({ locale }) => (
					<NewPageList locale={locale} />
				))}
			</Suspense>
			<div className="flex justify-center">
				<Button className="rounded-full w-40 h-10" variant="default">
					<Link className="flex items-center gap-2" href="/new-pages">
						More <ArrowRightIcon className="w-4 h-4" />
					</Link>
				</Button>
			</div>

			<Suspense fallback={<SectionSkeleton className="h-[400px] w-full" />}>
				{params.then(({ locale }) => (
					<PopularPageList locale={locale} />
				))}
			</Suspense>
		</div>
	);
}
