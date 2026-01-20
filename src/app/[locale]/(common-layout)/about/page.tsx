import type { Metadata } from "next";
import type React from "react";
import AboutSection from "@/app/[locale]/(common-layout)/_components/about-section/server";

export const metadata: Metadata = {
	title: "Evame - About",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

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
