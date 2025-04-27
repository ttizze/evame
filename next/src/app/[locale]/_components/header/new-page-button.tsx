"use client";

import { Loader2, PencilIcon } from "lucide-react";
import { customAlphabet } from "nanoid";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewPageButtonProps {
	handle: string;
}

const generateSlug = () =>
	customAlphabet(
		"0123456789abcdefghijklmnopqrstuvwxyz",
		12,
	)();

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
			type="button"
			onClick={handleNewPage}
			disabled={isLoading}
			className="cursor-pointer items-center"
		>
			{isLoading ? (
				<Loader2 className="h-6 w-6 animate-spin" />
			) : (
				<PencilIcon className="h-6 w-6" />
			)}
		</button>
	);
};
