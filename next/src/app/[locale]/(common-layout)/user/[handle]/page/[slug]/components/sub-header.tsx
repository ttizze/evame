"use client";
import type { PageWithTranslations } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ChevronDown, List } from "lucide-react";
import { useState } from "react";
import Headroom from "react-headroom";
import Toc, { useHasTableOfContents } from "./toc";

export function SubHeader({
	pageWithTranslations,
}: {
	pageWithTranslations: PageWithTranslations;
}) {
	const [isTocOpen, setIsTocOpen] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const hasTocContent = useHasTableOfContents();

	const renderToc = () => {
		if (!hasTocContent) return null;

		return (
			<>
				<Button
					variant="ghost"
					className={
						"relative bg-background self-end flex items-center gap-1 rounded-full"
					}
					onClick={() => setIsTocOpen(!isTocOpen)}
					title="Table of Contents"
				>
					<List className="h-5 w-5" />
					<div
						className="transition-transform duration-300 ease-in-out"
						style={{ transform: isTocOpen ? "rotate(180deg)" : "rotate(0deg)" }}
					>
						<ChevronDown className="h-4 w-4" />
					</div>
				</Button>

				{isTocOpen && (
					<div
						className={`absolute right-0 top-full mt-2 z-50 bg-background rounded-xl
          px-3 py-4 drop-shadow-xl dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)] 
          border border-border animate-in zoom-in-95 duration-200`}
					>
						<Toc onItemClick={() => setIsTocOpen(false)} />
					</div>
				)}
			</>
		);
	};

	return (
		<Headroom
			onPin={() => setIsPinned(true)}
			onUnpin={() => setIsPinned(false)}
			onUnfix={() => setIsPinned(false)}
		>
			<div className="bg-background py-4">
				<div
					className={`w-full prose dark:prose-invert sm:prose lg:prose-lg mx-auto 
          flex items-center not-prose justify-between relative ${isPinned ? "px-4" : ""}`}
				>
					<Link
						href={`/user/${pageWithTranslations.user.handle}`}
						className="flex items-center mr-2 !no-underline hover:text-gray-700"
					>
						<Avatar className="w-10 h-10 flex-shrink-0 mr-3 ">
							<AvatarImage
								src={pageWithTranslations.user.image}
								alt={pageWithTranslations.user.name}
							/>
							<AvatarFallback>
								{pageWithTranslations.user.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-sm">{pageWithTranslations.user.name}</span>
							{!isPinned && (
								<span className="text-xs text-gray-500">
									{pageWithTranslations.page.createdAt}
								</span>
							)}
						</div>
					</Link>
					{renderToc()}
				</div>
			</div>
		</Headroom>
	);
}
