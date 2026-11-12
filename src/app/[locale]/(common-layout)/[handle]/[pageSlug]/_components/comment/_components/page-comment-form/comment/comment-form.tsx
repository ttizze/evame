import { useState } from "react";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { Editor } from "@/app/[locale]/_components/editor/editor";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { Button } from "@/components/ui/button";

type Hidden = Record<string, string | number | undefined>;

interface CommentFormProps {
	action: (formData: FormData) => void;
	hidden: Hidden;
	isPending: boolean;
	errorMsg?: string[];
}

/** 認証状態に応じたコメント入力を表示し、Markdown本文をフォームへ渡す。 */
export function CommentForm({
	action,
	hidden,
	isPending,
	errorMsg,
}: CommentFormProps) {
	const hydrated = useHydrated();
	const t = useTranslations("Editor");
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
						onChange={setContent}
						placeholder={t("commentPlaceholder")}
						showMenus={false}
					/>
				) : (
					<div
						aria-disabled="true"
						className="rounded-md border border-input bg-muted px-2 py-3 opacity-50"
					>
						{t("commentPlaceholder")}
					</div>
				)}

				{!currentUser && (
					<StartButton
						className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
						compactOnMobile={false}
					/>
				)}

				<Button
					className="w-full"
					disabled={isPending || !currentUser || content.length === 0}
					type="submit"
				>
					{isPending ? t("posting") : t("post")}
				</Button>
			</form>
			{errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
		</>
	);
}
