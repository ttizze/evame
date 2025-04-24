import type { SegmentBundle } from "@/app/[locale]/types";
import type { Prisma } from "@prisma/client";
import { mdastToReact } from "./mdast-to-react";

export function ArticleBody({
	mdast,
	bundles,
	currentHandle,
}: {
	mdast: Prisma.JsonValue;
	bundles: SegmentBundle[];
	currentHandle?: string;
}) {
	const content = mdastToReact({ mdast, bundles, currentHandle });
	return <article className="prose dark:prose-invert">{content}</article>;
}
