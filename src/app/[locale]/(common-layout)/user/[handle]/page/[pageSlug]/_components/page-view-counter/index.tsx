import { incrementPageView } from "../../_db/mutations.server";

type PageViewCounterProps = {
	pageId: number;
	className?: string;
};

export async function PageViewCounter({
	pageId,
	className = "text-muted-foreground",
}: PageViewCounterProps) {
	const count = await incrementPageView(pageId);

	return <span className={className}>{count}</span>;
}
