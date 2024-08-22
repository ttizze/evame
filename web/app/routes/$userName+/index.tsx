import type { LoaderFunctionArgs } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import Linkify from "linkify-react";
import { Lock, MoreVertical } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { authenticator } from "~/utils/auth.server";
import {
	archivePage,
	togglePagePublicStatus,
} from "./functions/mutations.server";
import { getSanitizedUserWithPages } from "./functions/queries.server";
import type { sanitizedUserWithPages } from "./types";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	const { userName } = params;
	if (!userName) throw new Error("Username is required");
	const currentUser = await authenticator.isAuthenticated(request);
	const isOwner = currentUser?.userName === userName;

	const sanitizedUserWithPages = await getSanitizedUserWithPages(
		userName,
		isOwner,
	);
	if (!sanitizedUserWithPages) throw new Response("Not Found", { status: 404 });

	return { sanitizedUserWithPages, isOwner };
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const intent = formData.get("intent");
	const pageId = formData.get("pageId");

	if (!pageId) {
		return { error: "Page ID is required" };
	}

	switch (intent) {
		case "togglePublish":
			return await togglePagePublicStatus(Number(pageId));
		case "archive":
			return await archivePage(Number(pageId));
		default:
			return { error: "Invalid action" };
	}
};

export default function UserProfile() {
	const { sanitizedUserWithPages, isOwner } = useLoaderData<{
		sanitizedUserWithPages: sanitizedUserWithPages;
		isOwner: boolean;
	}>();

	const fetcher = useFetcher();

	const togglePagePublicStatus = (pageId: number) => {
		fetcher.submit(
			{ intent: "togglePublish", pageId: pageId },
			{ method: "post" },
		);
	};

	const handleArchive = (pageId: number) => {
		if (
			confirm(
				"Are you sure you want to delete this page? This action cannot be undone.",
			)
		) {
			fetcher.submit({ intent: "archive", pageId: pageId }, { method: "post" });
		}
	};

	return (
		<div className="container mx-auto">
			<Card className="h-full mb-6">
				<CardHeader>
					<CardTitle className="text-3xl font-bold flex justify-between items-center">
						{sanitizedUserWithPages.displayName}
						{isOwner && (
							<Link to={`/${sanitizedUserWithPages.userName}/edit`}>
								<Button variant="outline">Edit</Button>
							</Link>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="whitespace-pre-wrap">
					<Linkify options={{ className: "underline" }}>
						{sanitizedUserWithPages.profile}
					</Linkify>
				</CardContent>
			</Card>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{sanitizedUserWithPages.pages.map((page) => (
					<Card key={page.id} className="h-full relative">
						{isOwner && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="h-8 w-8 p-0 absolute top-2 right-2"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onSelect={() => togglePagePublicStatus(page.id)}
									>
										{page.isPublished ? "Make Private" : "Make Public"}
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => handleArchive(page.id)}>
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						<Link
							to={`/${sanitizedUserWithPages.userName}/page/${page.slug}`}
							key={page.id}
							className="h-full"
						>
							<CardHeader>
								<CardTitle className="line-clamp-2 flex items-center">
									{page.isPublished ? "" : <Lock className="h-4 w-4 mr-2" />}
									{page.title}
								</CardTitle>
								<CardDescription>
									{new Date(page.createdAt).toLocaleDateString()}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex-grow overflow-hidden px-4">
								<p className="text-sm text-gray-600 line-clamp-4 break-words">
									{page.content}
								</p>
							</CardContent>
						</Link>
					</Card>
				))}
			</div>

			{sanitizedUserWithPages.pages.length === 0 && (
				<p className="text-center text-gray-500 mt-10">
					{isOwner ? "You haven't created any pages yet." : "No pages yet."}
				</p>
			)}
		</div>
	);
}