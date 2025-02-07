import { StartButton } from "@/app/[locale]/components/start-button";
import { Editor } from "@/app/[locale]/user/[handle]/page/[slug]/edit/components/editor/Editor";
import { Button } from "@/components/ui/button";
import { commentAction } from "./action";

export function PageCommentForm({
	pageId,
	currentHandle,
}: { pageId: number; currentHandle: string | undefined }) {


	return (
		<>
			<form
				action={commentAction}
				className="space-y-4 relative prose dark:prose-invert"
			>
				<input type="hidden" name="pageId" value={pageId} />
				<input type="hidden" name="intent" value="create" />
				<Editor
					defaultValue={""}
					InputControl={commentControl}
					className="border border-input rounded-md px-2"
					placeholder="Say Hello!"
				/>
				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
				)}
				<Button
					type="submit"
					disabled={fetcher.state !== "idle" || !currentHandle}
					className={"w-full"}
				>
					{fetcher.state !== "idle" ? "posting" : "post"}
				</Button>
			</form>
			{fields.content.errors && (
				<p className="text-sm text-red-500">
					{fields.content.errors?.join(", ")}
				</p>
			)}
		</>
	);
}
