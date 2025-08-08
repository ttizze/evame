import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsString } from "nuqs/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

const NewPageList = dynamic(
	() => import("@/app/[locale]/_components/page/new-page-list/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

import { ArrowRightIcon } from "lucide-react";
import AboutSection from "../_components/about-section/server";

const NewPageListByTag = dynamic(
	() => import("@/app/[locale]/_components/page/new-page-list-by-tag/server"),
	{
		loading: () => <Skeleton className="h-[400px] w-full mb-10" />,
	},
);

export const metadata: Metadata = {
	title: "Evame - Home - Latest Pages",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

const searchParamsSchema = {
	tab: parseAsString.withDefault("home"),
	sort: parseAsString.withDefault("popular"),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function HomePage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const { locale } = await params;
	await loadSearchParams(searchParams);
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			<AboutSection locale={locale} topPage={true} />
			<NewPageList
				locale={locale}
				searchParams={searchParams}
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
