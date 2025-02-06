"use client";

import { Loader2, PencilIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const generateSlug = (length = 8): string => {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let slug = "";
	while (slug.length < length) {
		const byte = crypto.getRandomValues(new Uint8Array(1))[0];
		if (byte < 248) {
			slug += charset[byte % 62];
		}
	}
	return slug;
};
interface NewPageButtonProps {
	handle: string;
}

export const NewPageButton = ({ handle }: NewPageButtonProps) => {
	const router = useRouter();
	const locale = useLocale();
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		setIsLoading(false);
	}, []);

	const handleNewPage = () => {
		setIsLoading(true);
		const newSlug = generateSlug();
		router.push(`/${locale}/user/${handle}/page/${newSlug}/edit`);
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
				<>
					<PencilIcon className="h-6 w-6" />
				</>
			)}
		</button>
	);
};
