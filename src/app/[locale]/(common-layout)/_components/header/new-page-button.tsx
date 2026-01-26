"use client";

import { Loader2, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { generateSlug } from "@/app/[locale]/_utils/generate-slug";

interface NewPageButtonProps {
	handle: string;
}

export const NewPageButton = ({ handle }: NewPageButtonProps) => {
	const router = useRouter();
	const locale = useLocale();
	const [isPending, startTransition] = useTransition();

	const handleNewPage = () => {
		startTransition(() => {
			router.push(`/${locale}/${handle}/${generateSlug()}/edit`);
		});
	};

	return (
		<button
			className="cursor-pointer items-center"
			disabled={isPending}
			onClick={handleNewPage}
			type="button"
		>
			{isPending ? (
				<Loader2 className="h-6 w-6 animate-spin" />
			) : (
				<PencilIcon className="h-6 w-6" />
			)}
		</button>
	);
};
