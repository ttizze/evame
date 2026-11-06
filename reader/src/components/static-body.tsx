import { mdastToReact } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/mdast-to-react";
import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/db/types";

export function StaticBody({
	mdast,
	segments,
}: {
	mdast: JsonValue;
	segments: Segment[];
}) {
	return (
		<div className="js-content">
			{mdastToReact({ mdast, segments, Tweet: StaticTweet })}
		</div>
	);
}

function StaticTweet({ id }: { id: string }) {
	return (
		<div data-tweet-id={id}>
			<noscript>
				<a href={`https://x.com/i/status/${id}`}>X</a>
			</noscript>
		</div>
	);
}
