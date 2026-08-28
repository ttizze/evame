import type { Metadata } from "next";
import type React from "react";
import AboutSection from "@/app/[locale]/(common-layout)/_components/about-section/server";
import { getAboutMetadata } from "./metadata";

export async function generateMetadata(
	props: PageProps<"/[locale]/about">,
): Promise<Metadata> {
	const { locale } = await props.params;
	const { title, description, alternates } = getAboutMetadata(locale);

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates,
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
