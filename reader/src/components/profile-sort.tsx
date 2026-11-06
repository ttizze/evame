import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { messages } from "@/i18n/messages";

export function ProfileSortIsland({
	locale,
	sort,
	pathname,
	search,
}: {
	locale: string;
	sort: "new" | "popular";
	pathname: string;
	search: string;
}) {
	const t = (messages[locale as keyof typeof messages] ?? messages.en).Reader;
	return (
		<div className="my-4 flex justify-center">
			<Tabs
				className="w-11/12"
				onValueChange={(value) => {
					const params = new URLSearchParams(search);
					params.set("sort", value);
					params.delete("page");
					window.location.assign(`${pathname}?${params}`);
				}}
				value={sort}
			>
				<TabsList className="w-full flex justify-center rounded-full">
					<TabsTrigger className="text-xs w-1/2 rounded-full" value="popular">
						{t.popularPages}
					</TabsTrigger>
					<TabsTrigger className="text-xs w-1/2 rounded-full" value="new">
						{t.newPages}
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
