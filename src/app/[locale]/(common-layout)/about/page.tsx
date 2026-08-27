import AboutSection from "../_components/about-section/server";

export default function AboutPage({ locale }: { locale: string }) {
	return <AboutSection locale={locale} topPage={false} />;
}
