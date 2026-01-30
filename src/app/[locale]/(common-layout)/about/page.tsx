import type { Metadata } from "next";
import type React from "react";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import AboutSection from "@/app/[locale]/(common-layout)/_components/about-section/server";

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
				"Write in your native language. The world reads. Evame breaks language barriers to share your articles globally.",
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
				"Escribe en tu idioma nativo. El mundo lee. Evame rompe las barreras del idioma para compartir tus artículos globalmente.",
		},
	};

export async function generateMetadata(
	props: PageProps<"/[locale]/about">,
): Promise<Metadata> {
	const { locale } = await props.params;
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/about"),
	};
}

export async function generateStaticParams() {
	const locales = ["en", "ja", "zh", "ko", "es"];

	return locales.map((locale) => ({
		locale,
	}));
}
export default async function AboutPage(
	props: PageProps<"/[locale]/about">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;

	return <AboutSection locale={locale} topPage={false} />;
}
