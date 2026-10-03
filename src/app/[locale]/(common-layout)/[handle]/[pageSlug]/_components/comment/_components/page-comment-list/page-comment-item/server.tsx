import type { PageCommentWithSegments } from "../_db/queries.server";
import { PageCommentItem as PageCommentItemClient } from "./client";

export default function PageCommentItem({
	pageComment,
	userLocale,
}: {
	pageComment: PageCommentWithSegments;
	userLocale: string;
}) {
	return (
		<PageCommentItemClient pageComment={pageComment} userLocale={userLocale} />
	);
}
