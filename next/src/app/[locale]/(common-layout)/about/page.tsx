import { Globe } from "@/components/magicui/globe";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Book, Code, Heart, MessageSquare, Users } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const HeroSection = dynamic(
	() => import("@/app/[locale]/components/hero-section/index"),
	{
		loading: () => <Skeleton className="h-[845px] w-full" />,
	},
);

export const metadata: Metadata = {
	title: "Evame - About",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

const features = [
	{
		icon: <Book className="h-10 w-10 text-primary" />,
		title: "Automatic Translation",
		description:
			"Articles and comments are automatically translated to multiple languages, breaking down language barriers.",
	},
	{
		icon: <Book className="h-10 w-10 text-primary" />,
		title: "Multilingual Content",
		description:
			"Share your thoughts in any language and reach a global audience instantly.",
	},
	{
		icon: <MessageSquare className="h-10 w-10 text-primary" />,
		title: "Real-time Comments",
		description:
			"Engage in discussions with people from around the world in your preferred language.",
	},
	{
		icon: <Users className="h-10 w-10 text-primary" />,
		title: "Global Community",
		description:
			"Connect with diverse perspectives and ideas from across cultural boundaries.",
	},
	{
		icon: <Code className="h-10 w-10 text-primary" />,
		title: "Open Source",
		description:
			"Built with transparency and collaboration in mind, open for contributions from everyone.",
	},
	{
		icon: <Heart className="h-10 w-10 text-primary" />,
		title: "Community Driven",
		description:
			"Shaped by the needs and feedback of our diverse global community of users.",
	},
];

export default async function AboutPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { locale } = await params;

	// Translation function placeholder - would be implemented with actual translation service
	const t = (key: string) => {
		const translations: { [key: string]: { [key: string]: string } } = {
			"about.title": {
				en: "About Evame",
				ja: "Evameについて",
				fr: "À propos d'Evame",
				es: "Acerca de Evame",
				zh: "关于Evame",
			},
			"about.subtitle": {
				en: "Breaking language barriers through technology",
				ja: "テクノロジーで言語の壁を壊す",
				fr: "Briser les barrières linguistiques grâce à la technologie",
				es: "Rompiendo barreras lingüísticas a través de la tecnología",
				zh: "通过技术打破语言障碍",
			},
			"about.mission": {
				en: "Our Mission",
				ja: "私たちのミッション",
				fr: "Notre Mission",
				es: "Nuestra Misión",
				zh: "我们的使命",
			},
			"about.mission.text": {
				en: "Evame aims to create a world where language is no longer a barrier to communication and knowledge sharing. Through automatic translation technology, we enable people from different linguistic backgrounds to connect, share ideas, and learn from each other.",
				ja: "Evameは、言語がコミュニケーションや知識共有の障壁ではない世界を作ることを目指しています。自動翻訳技術を通じて、異なる言語背景を持つ人々が繋がり、アイデアを共有し、お互いから学ぶことを可能にします。",
				fr: "Evame vise à créer un monde où la langue n'est plus un obstacle à la communication et au partage des connaissances. Grâce à la technologie de traduction automatique, nous permettons aux personnes de différentes origines linguistiques de se connecter, de partager des idées et d'apprendre les unes des autres.",
				es: "Evame aspira a crear un mundo donde el idioma ya no sea una barrera para la comunicación y el intercambio de conocimientos. A través de la tecnología de traducción automática, permitimos que personas de diferentes orígenes lingüísticos se conecten, compartan ideas y aprendan unas de otras.",
				zh: "Evame旨在创建一个语言不再成为沟通和知识共享障碍的世界。通过自动翻译技术，我们使不同语言背景的人们能够连接、分享想法并相互学习。",
			},
			"about.features": {
				en: "Features",
				ja: "特徴",
				fr: "Fonctionnalités",
				es: "Características",
				zh: "功能",
			},
			"about.join": {
				en: "Join Our Community",
				ja: "コミュニティに参加する",
				fr: "Rejoignez Notre Communauté",
				es: "Únete a Nuestra Comunidad",
				zh: "加入我们的社区",
			},
			"about.join.text": {
				en: "Be part of a growing global network of individuals passionate about cross-cultural communication and knowledge sharing.",
				ja: "異文化間コミュニケーションと知識共有に情熱を持つ個人の成長するグローバルネットワークの一員になりましょう。",
				fr: "Faites partie d'un réseau mondial croissant d'individus passionnés par la communication interculturelle et le partage des connaissances.",
				es: "Forma parte de una creciente red global de personas apasionadas por la comunicación intercultural y el intercambio de conocimientos.",
				zh: "成为对跨文化交流和知识共享充满热情的个人不断发展的全球网络的一部分。",
			},
			"about.join.button": {
				en: "Sign Up Now",
				ja: "今すぐサインアップ",
				fr: "Inscrivez-vous Maintenant",
				es: "Regístrate Ahora",
				zh: "立即注册",
			},
		};

		return translations[key][locale] || translations[key].en;
	};

	return (
		<div className="flex flex-col justify-between">
			<HeroSection locale={locale} />
			<div className="relative flex size-full max-w-lg items-center justify-center overflow-hidden rounded-lg border bg-background px-40 pb-40 pt-8 md:pb-60">
				<span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
					World
				</span>
				<Globe className="top-28" />
				<div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
			</div>
			<div className="container mx-auto px-4 py-16">
				<div className="text-center mb-16">
					<h1 className="text-4xl font-bold mb-4">{t("about.title")}</h1>
					<p className="text-xl text-muted-foreground">{t("about.subtitle")}</p>
				</div>

				<div className="mb-20">
					<h2 className="text-3xl font-bold mb-6 text-center">
						{t("about.mission")}
					</h2>
					<p className="text-lg max-w-3xl mx-auto text-center">
						{t("about.mission.text")}
					</p>
				</div>

				<div className="mb-20">
					<h2 className="text-3xl font-bold mb-10 text-center">
						{t("about.features")}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{features.map((feature, index) => (
							<Card
								key={feature.title}
								className="hover:shadow-lg transition-shadow"
							>
								<CardHeader className="flex flex-row items-center gap-4">
									{feature.icon}
									<CardTitle>{feature.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				<div className="bg-primary/10 rounded-lg p-8 text-center max-w-2xl mx-auto">
					<h2 className="text-2xl font-bold mb-4">{t("about.join")}</h2>
					<p className="mb-6">{t("about.join.text")}</p>
					<Button size="lg" className="font-medium">
						{t("about.join.button")}
					</Button>
				</div>
			</div>
		</div>
	);
}
