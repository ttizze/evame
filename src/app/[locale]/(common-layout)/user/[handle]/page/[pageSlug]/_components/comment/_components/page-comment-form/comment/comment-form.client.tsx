// components/CommentFormLayout.tsx
"use client";

import { useState } from "react";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { Editor } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/editor/editor";
import { Button } from "@/components/ui/button";

type Hidden = Record<string, string | number | undefined>;

interface Props {
	/** form の action 属性に渡す Server Action */
	action: (formData: FormData) => void;
	/** <input type="hidden"> にしたい name=value 一覧 */
	hidden: Hidden;
	/** ログイン中ハンドル（未ログインなら undefined） */
	currentHandle?: string;
	/** POST 中かどうか（isPending 相当） */
	isPending: boolean;
	/** content フィールドの Zod エラー (無ければ undefined) */
	errorMsg?: string[];
}

export function CommentForm({
	action,
	hidden,
	currentHandle,
	isPending,
	errorMsg,
}: Props) {
	const [content, setContent] = useState("");

	return (
		<>
			<form action={action} className="space-y-4 relative">
				{/* hidden inputs */}
				{Object.entries(hidden).map(
					([k, v]) =>
						v !== undefined && (
							<input key={k} name={k} type="hidden" value={v} />
						),
				)}

				<Editor
					className={`border border-input rounded-md px-2 ${
						!currentHandle ? "opacity-50 bg-muted" : ""
					}`}
					defaultValue={content}
					name="content"
					onEditorUpdate={(ed) => setContent(ed?.getHTML() ?? "")}
					placeholder="Say Hello!"
				/>

				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
				)}

				<Button
					className="w-full"
					disabled={isPending || !currentHandle || content.length === 0}
					type="submit"
				>
					{isPending ? "posting" : "post"}
				</Button>
			</form>

			{errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
		</>
	);
}
