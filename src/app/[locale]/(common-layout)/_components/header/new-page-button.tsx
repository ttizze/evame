"use client";

import { useNavigate } from "@tanstack/react-router";
import { Loader2, PencilIcon } from "lucide-react";
import { useTransition } from "react";
import { generateSlug } from "@/app/[locale]/_utils/generate-slug";

export function NewPageButton({
	handle,
	locale,
}: {
	handle: string;
	locale: string;
}) {
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();

	const handleNewPage = () => {
		const pageSlug = generateSlug();
		startTransition(() => {
			void navigate({
				params: { handle, locale, pageSlug },
				to: "/$locale/$handle/$pageSlug/edit",
			});
		});
	};

	return (
		<button
			aria-label="Create a new page"
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
}
