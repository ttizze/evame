// components/CommentFormLayout.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { Button } from "@/components/ui/button";

type Hidden = Record<string, string | number | undefined>;

interface Props {
	/** form の action 属性に渡す Server Action */
	action: (formData: FormData) => void;
	/** <input type="hidden"> にしたい name=value 一覧 */
	hidden: Hidden;
	/** POST 中かどうか（isPending 相当） */
	isPending: boolean;
	/** content フィールドの Zod エラー (無ければ undefined) */
	errorMsg?: string[];
}

const Editor = dynamic(
	() =>
		import(
			"@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/editor/editor"
		).then((m) => m.Editor),
	{ ssr: false },
);

export function CommentForm({ action, hidden, isPending, errorMsg }: Props) {
	const hydrated = useHydrated();
	const [content, setContent] = useState("");
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
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

				{currentUser ? (
					<Editor
						className="border border-input rounded-md px-2"
						defaultValue={content}
						name="content"
						onEditorUpdate={(ed) => setContent(ed?.getHTML() ?? "")}
						placeholder="Say Hello!"
						// コメント欄ではメニュー表示が不要で、position 計測が重くなりやすいので無効化する
						showMenus={false}
					/>
				) : (
					<div
						aria-disabled="true"
						className="border border-input rounded-md px-2 py-3 opacity-50 bg-muted"
					>
						Say Hello!
					</div>
				)}

				{!currentUser && (
					<StartButton className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
				)}

				<Button
					className="w-full"
					disabled={isPending || !currentUser || content.length === 0}
					type="submit"
				>
					{isPending ? "posting" : "post"}
				</Button>
			</form>

			{errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
		</>
	);
}
