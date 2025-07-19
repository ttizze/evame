"use client";

import { Loader2, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useState } from "react";
import { generateSlug } from "@/app/[locale]/_lib/generate-slug";

interface NewPageButtonProps {
	handle: string;
}

export const NewPageButton = ({ handle }: NewPageButtonProps) => {
	const router = useRouter();
	const locale = useLocale();
	const [isLoading, setIsLoading] = useState(false);

	const handleNewPage = () => {
		setIsLoading(true);
		router.push(`/${locale}/user/${handle}/page/${generateSlug()}/edit`);
	};

	return (
		<button
			className="cursor-pointer items-center"
			disabled={isLoading}
			onClick={handleNewPage}
			type="button"
		>
			{isLoading ? (
				<Loader2 className="h-6 w-6 animate-spin" />
			) : (
				<PencilIcon className="h-6 w-6" />
			)}
		</button>
	);
};
