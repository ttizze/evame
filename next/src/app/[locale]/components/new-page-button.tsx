"use client";

import { customAlphabet } from 'nanoid';
import { Loader2, PencilIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {  useState } from "react";

interface NewPageButtonProps {
	handle: string;
}

const generateSlug = () => customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 8)();


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
			className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white  flex cursor-pointer items-center  text-sm"
		>
			{isLoading ? (
				<Loader2 className="h-6 w-6 animate-spin" />
			) : (
					<PencilIcon className="h-6 w-6" />
			)}
		</button>
	);
};
