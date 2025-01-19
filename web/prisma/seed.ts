import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface SeedText {
	text: string;
	number: number;
	pageId: number;
	textAndOccurrenceHash: string;
	translations: {
		text: string;
		locale: string;
	}[];
}

async function seed() {
	await addRequiredData();

	if (process.env.NODE_ENV === "development") {
		await addDevelopmentData();
	}
}

async function addRequiredData() {
	const { evame, evameEnPage, evameJaPage } = await createUserAndPages();

	const seedTexts: SeedText[] = [
		{
			text: "Write to the World",
			number: 0,
			pageId: evameEnPage.id,
			textAndOccurrenceHash: "write-to-the-world",
			translations: [
				{
					text: "世界に向けて書く",
					locale: "ja",
				},
			],
		},
		{
			text: `Evame is an open platform where anyone can read and write articles in their own language.
			User-submitted posts are automatically translated into multiple languages,
			allowing people around the globe to share and discover stories without linguistic barriers.
			Community-driven corrections and voting continually improve translation quality, fostering
			an environment where knowledge and ideas flow freely across borders.`,
			number: 1,
			textAndOccurrenceHash:
				"evame-is-an-innovative-open-source-platform-that-enables-everyone-to-read-articles-in-their-native-language-regardless-of-the-original-language-through-user-contributed-content-and-collaborative-translations-we-break-down-language-barriers-fostering-global-understanding-and-knowledge-sharing",
			pageId: evameEnPage.id,
			translations: [
				{
					text: `Evameは、あなたの記事を翻訳し、世界中の読者に届けるコミュニティです。
					母国語で思いのまま書けば、翻訳を通じて世界の読者があなたの文章を楽しめます。
					さらに、コミュニティの投票と修正で翻訳精度がどんどん良くなるから、海外の反応も得やすい。
					Evameで、あらゆる知識や物語を互いに届け合いましょう。`,
					locale: "ja",
				},
			],
		},
		{
			text: "世界に向けて書く",
			number: 0,
			pageId: evameJaPage.id,
			textAndOccurrenceHash: "世界に向けて書く",
			translations: [
				{
					text: "Write to the World",
					locale: "en",
				},
			],
		},
		{
			text: `Evameは、あなたの記事を翻訳し、世界中の読者に届けるコミュニティです。
					母国語で思いのまま書けば、翻訳を通じて世界の読者があなたの文章を楽しめます。
					さらに、コミュニティの投票と修正で翻訳精度がどんどん良くなるから、海外の反応も得やすい。
					Evameで、あらゆる知識や物語を互いに届け合いましょう。`,
			number: 1,
			pageId: evameJaPage.id,
			textAndOccurrenceHash:
				"evame-is-an-innovative-open-source-platform-that-enables-everyone-to-read-articles-in-their-native-language-regardless-of-the-original-language-through-user-contributed-content-and-collaborative-translations-we-break-down-language-barriers-fostering-global-understanding-and-knowledge-sharing",
			translations: [
				{
					text: "Evame is an innovative open-source platform that enables everyone to read articles in their native language, regardless of the original language. Through user-contributed content and collaborative translations, we break down language barriers, fostering global understanding and knowledge sharing.",
					locale: "en",
				},
			],
		},
	];

	await Promise.all(
		seedTexts.map((text) => upsertSourceTextWithTranslations(text, evame.id)),
	);

	console.log("Required data added successfully");
}

async function createUserAndPages() {
	const evame = await prisma.user.upsert({
		where: { userName: "evame" },
		update: {
			provider: "Admin",
			icon: "https://evame.tech/favicon.svg",
		},
		create: {
			userName: "evame",
			displayName: "evame",
			provider: "Admin",
			icon: "https://evame.tech/favicon.svg",
			userEmail: {
				create: {
					email: "evame@example.com",
				},
			},
		},
	});

	const [evameEnPage, evameJaPage] = await Promise.all([
		prisma.page.upsert({
			where: { slug: "evame" },
			update: {},
			create: {
				slug: "evame",
				sourceLanguage: "en",
				content:
					"Evame is an innovative open-source platform that enables everyone to read articles in their native language, regardless of the original language. Through user-contributed content and collaborative translations, we break down language barriers, fostering global understanding and knowledge sharing.",
				status: "DRAFT",
				userId: evame.id,
			},
		}),
		prisma.page.upsert({
			where: { slug: "evame-ja" },
			update: {},
			create: {
				slug: "evame-ja",
				sourceLanguage: "ja",
				content:
					"Evameは、誰もが母国語で文章を読めるようにする革新的なオープンソースプラットフォームです。ユーザーによる投稿と翻訳を通じて、言語の障壁を取り除き、世界中の理解と知識の共有を促進します。",
				status: "DRAFT",
				userId: evame.id,
			},
		}),
	]);

	return { evame, evameEnPage, evameJaPage };
}

async function upsertSourceTextWithTranslations(
	sourceText: SeedText,
	userId: number,
) {
	const upsertedSourceText = await prisma.sourceText.upsert({
		where: {
			pageId_number: {
				pageId: sourceText.pageId,
				number: sourceText.number,
			},
		},
		update: {},
		create: {
			text: sourceText.text,
			number: sourceText.number,
			pageId: sourceText.pageId,
			textAndOccurrenceHash: sourceText.textAndOccurrenceHash,
		},
	});

	await Promise.all(
		sourceText.translations.map((translation) =>
			prisma.translateText.create({
				data: {
					text: translation.text,
					sourceTextId: upsertedSourceText.id,
					userId,
					locale: translation.locale,
				},
			}),
		),
	);
}

export async function addDevelopmentData() {
	const email = "dev@example.com";

	const devEmail = await prisma.userEmail.upsert({
		where: { email },
		update: {
			user: {
				update: {},
			},
		},
		create: {
			email,
			user: {
				create: {
					userName: "dev",
					displayName: "Dev User",
					icon: "",
					credential: {
						create: {
							password: await bcrypt.hash("devpassword", 10),
						},
					},
				},
			},
		},
		include: {
			user: true,
		},
	});

	console.log(
		`Created/Updated dev user with ID=${devEmail.userId}, email=${devEmail.email}`,
	);
}
seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
