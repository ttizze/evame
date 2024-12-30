import type { MetaFunction } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import i18nServer from "~/i18n.server";
import { SourceTextAndTranslationSection } from "~/routes/$locale+/user.$userName+/page+/$slug+/components/sourceTextAndTranslationSection/SourceTextAndTranslationSection";
import { fetchPageWithTranslations } from "~/routes/$locale+/user.$userName+/page+/$slug+/functions/queries.server";
import { authenticator } from "~/utils/auth.server";
import { StartButton } from "../../components/StartButton";
import { supportedLocales } from "~/constants/languages";
import { redirect } from "@remix-run/node";

export const meta: MetaFunction = () => {
	return [
		{ title: "Evame" },
		{
			name: "description",
			content:
				"Evame is an open-source platform for collaborative article translation and sharing.",
		},
	];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);
	let locale = params.locale;
	if (!locale || !supportedLocales.some((l) => l.code === locale)) {
		locale = (await i18nServer.getLocale(request)) || "en";
		return redirect(`/${locale}/home`);
	}
	const pageName = locale === "en" ? "evame-ja" : "evame";
	const topPageWithTranslations = await fetchPageWithTranslations(
		pageName,
		currentUser?.id ?? 0,
		locale,
	);
	if (!topPageWithTranslations) {
		throw new Response("Not Found", { status: 404 });
	}
	const [heroTitle, heroText] =
		topPageWithTranslations.sourceTextWithTranslations
			.filter((st) => st.sourceText.number === 0 || st.sourceText.number === 1)
			.sort((a, b) => a.sourceText.number - b.sourceText.number);

	if (!heroTitle || !heroText) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		currentUser,
		heroTitle,
		heroText,
	};
}

export default function Index() {
	const { currentUser, heroTitle, heroText } = useLoaderData<typeof loader>();

	return (
		<div className="flex flex-col justify-between">
			<main className="prose dark:prose-invert sm:prose lg:prose-lg mx-auto px-2 py-10 flex flex-col items-center justify-center">
				<div className="max-w-4xl w-full">
					<h1 className="text-7xl font-bold mb-20 text-center">
						<SourceTextAndTranslationSection
							sourceTextWithTranslations={heroTitle}
							sourceTextClassName="w-full bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text !text-transparent mb-2"
							elements={heroTitle.sourceText.text}
							currentUserName={currentUser?.userName}
							showOriginal={true}
							showTranslation={true}
						/>
					</h1>

					<span className="text-xl mb-12 w-full">
						<SourceTextAndTranslationSection
							sourceTextWithTranslations={heroText}
							sourceTextClassName="mb-2"
							elements={heroText.sourceText.text}
							showOriginal={true}
							showTranslation={true}
							currentUserName={currentUser?.userName}
						/>
					</span>
					{!currentUser && (
						<div className="mb-12 flex justify-center mt-10">
							<StartButton className="w-60 h-12 text-xl" />
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
