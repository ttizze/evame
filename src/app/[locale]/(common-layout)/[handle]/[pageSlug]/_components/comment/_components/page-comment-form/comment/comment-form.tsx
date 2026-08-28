"use client";

import { useState } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { Editor } from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/editor/editor";
import { Button } from "@/components/ui/button";

type Hidden = Record<string, string | number | undefined>;

interface CommentFormProps {
	action: (formData: FormData) => void;
	hidden: Hidden;
	isPending: boolean;
	errorMsg?: string[];
}

export function CommentForm({
	action,
	hidden,
	isPending,
	errorMsg,
}: CommentFormProps) {
	const hydrated = useHydrated();
	const [content, setContent] = useState("");
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;

	return (
		<>
			<form action={action} className="relative space-y-4">
				{Object.entries(hidden).map(
					([key, value]) =>
						value !== undefined && (
							<input key={key} name={key} type="hidden" value={value} />
						),
				)}

				{currentUser ? (
					<Editor
						className="rounded-md border border-input px-2"
						defaultValue={content}
						name="content"
						onEditorUpdate={(editor) => setContent(editor?.getHTML() ?? "")}
						placeholder="Say Hello!"
						showMenus={false}
					/>
				) : (
					<div
						aria-disabled="true"
						className="rounded-md border border-input bg-muted px-2 py-3 opacity-50"
					>
						Say Hello!
					</div>
				)}

				{!currentUser && (
					<StartButton className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
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
