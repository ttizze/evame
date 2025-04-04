"use client";

import { Loader2, PencilIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewProjectButtonProps {
	handle: string;
}

export const NewProjectButton = ({ handle }: NewProjectButtonProps) => {
	const router = useRouter();
	const locale = useLocale();
	const [isLoading, setIsLoading] = useState(false);

	const handleNewPage = () => {
		setIsLoading(true);
		router.push(`/${locale}/user/${handle}/project/new`);
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
