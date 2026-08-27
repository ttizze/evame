import type {
	CreateTranslation,
	CreateTranslationJob,
	GetTranslationJob,
	ScriptureDetail,
	SubmitTranslationVote,
} from "@/components/scripture/types";
import type { PageInteractionState } from "@/server/page-interactions";
import type { ScriptureTreeNode } from "@/server/scripture-tree";
import { PageContent } from "./_components/page-content";

export type ScripturePageProps = {
	authenticated: boolean;
	detail: ScriptureDetail;
	locale: string;
	onCreateTranslation?: CreateTranslation;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	onVote: SubmitTranslationVote;
	createTranslationJob?: CreateTranslationJob;
	getTranslationJob?: GetTranslationJob;
	childPages?: readonly ScriptureTreeNode[];
	pageInteractions?: Pick<
		PageInteractionState,
		"liked" | "likeCount" | "viewCount"
	>;
};

export default function Page({
	authenticated,
	detail,
	locale,
	onCreateTranslation,
	onDeleteTranslation,
	onVote,
	createTranslationJob,
	getTranslationJob,
	childPages,
	pageInteractions,
}: ScripturePageProps) {
	return (
		<PageContent
			authenticated={authenticated}
			childPages={childPages}
			createTranslationJob={createTranslationJob}
			detail={detail}
			getTranslationJob={getTranslationJob}
			locale={locale}
			onCreateTranslation={onCreateTranslation}
			onDeleteTranslation={onDeleteTranslation}
			onVote={onVote}
			pageInteractions={pageInteractions}
		/>
	);
}
