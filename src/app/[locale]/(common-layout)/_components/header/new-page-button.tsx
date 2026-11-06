import { Loader2, PencilIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { generateSlug } from "@/app/[locale]/_utils/generate-slug";

export function NewPageButton({
	handle,
	locale,
}: {
	handle: string;
	locale: string;
}) {
	const [isPending, setIsPending] = useState(false);
	useEffect(() => {
		// ブラウザーの戻る操作でBFCacheから復帰した場合も、作成ボタンを再び使えるようにする。
		const onPageShow = () => setIsPending(false);
		window.addEventListener("pageshow", onPageShow);
		return () => window.removeEventListener("pageshow", onPageShow);
	}, []);
	return (
		<button
			aria-label="Create a new page"
			className="cursor-pointer items-center"
			disabled={isPending}
			onClick={() => {
				setIsPending(true);
				window.location.assign(`/${locale}/${handle}/${generateSlug()}/edit`);
			}}
			type="button"
		>
			{isPending ? (
				<Loader2 className="h-6 w-6 animate-spin" />
			) : (
				<PencilIcon className="h-6 w-6" />
			)}
		</button>
	);
}
