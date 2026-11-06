import { ArrowRightIcon, BookOpenIcon, SparklesIcon } from "lucide-react";
import { Fragment } from "react";
import { fromJSON } from "seroval";
import useSWR from "swr";
import type { loadHomePage } from "@/app/[locale]/(common-layout)/_components/home/service/load-home-page";
import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { messages } from "@/i18n/messages";

export function HomeFeedIsland({
	locale,
	initialData,
}: {
	locale: string;
	initialData: Awaited<ReturnType<typeof loadHomePage>>;
}) {
	const { data, error, isLoading, mutate } = useSWR(
		["home-feed", locale],
		async () => {
			const response = await fetch(
				`/api/reader-data?${new URLSearchParams({ path: `/${locale}` })}`,
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result = fromJSON(await response.json()) as {
				page: { data: typeof initialData };
			};
			return result.page.data;
		},
		{ fallbackData: initialData, refreshInterval: 30000 },
	);
	const localized = messages[locale as keyof typeof messages] ?? messages.en;
	const t = localized.Reader;
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			{error && (
				<p role="alert">
					{localized.Home.loadError}{" "}
					<Button onClick={() => void mutate()} variant="outline">
						{localized.Home.retry}
					</Button>
				</p>
			)}
			<div aria-busy={isLoading} className="flex flex-col gap-8">
				<PageLikeListClient
					pageIds={[
						...data.newPages.pageForLists,
						...data.popularPages.pageForLists,
					].map((page) => page.id)}
				/>
				{(["newPages", "popularPages"] as const).map((kind) => {
					const Icon = kind === "newPages" ? SparklesIcon : BookOpenIcon;
					const Heading = kind === "newPages" ? "h1" : "h2";
					return (
						<Fragment key={kind}>
							<section className="flex flex-col gap-4">
								<Heading className="text-2xl font-semibold mb-4 flex items-center gap-2">
									<Icon className="w-4 h-4" />
									{t[kind]}
								</Heading>
								{data[kind].pageForLists.map((page, index) => (
									<PageList
										avatar={
											<UserAvatar
												className="w-5 h-5 shrink-0"
												image={page.userImage}
												name={page.userHandle}
											/>
										}
										index={index}
										key={page.id}
										likeButton={
											<PageLikeButtonClient
												initialLikeCount={page.likeCount}
												pageId={page.id}
												showCount={false}
											/>
										}
										locale={locale}
										ownerActions={null}
										PageForList={page}
									/>
								))}
							</section>
							{kind === "newPages" && (
								<div className="flex justify-center">
									<Button asChild className="rounded-full h-10 w-40">
										<a
											className="flex items-center gap-2"
											href={`/${locale}/new-pages`}
										>
											{t.more}
											<ArrowRightIcon className="h-4 w-4" />
										</a>
									</Button>
								</div>
							)}
						</Fragment>
					);
				})}
			</div>
		</div>
	);
}
