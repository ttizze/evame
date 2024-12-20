import type { LoaderFunctionArgs } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import Linkify from "linkify-react";
import { Settings } from "lucide-react";
import { useState } from "react";
import { PageCard } from "~/components/PageCard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/ui/pagination";
import i18nServer from "~/i18n.server";
import { authenticator } from "~/utils/auth.server";
import { DeletePageDialog } from "./components/DeletePageDialog";
import {
	archivePage,
	togglePagePublicStatus,
} from "./functions/mutations.server";
import {
	fetchPageById,
	fetchSanitizedUserWithPages,
} from "./functions/queries.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return [{ title: "Profile" }];
	}
	return [{ title: data.sanitizedUserWithPages.displayName }];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	const locale = await i18nServer.getLocale(request);
	const { userName } = params;
	if (!userName) throw new Error("Username is required");

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") || "1");
	const pageSize = 9;

	const currentUser = await authenticator.isAuthenticated(request);
	const isOwner = currentUser?.userName === userName;

	const sanitizedUserWithPages = await fetchSanitizedUserWithPages(
		userName,
		page,
		pageSize,
	);
	if (!sanitizedUserWithPages) throw new Response("Not Found", { status: 404 });

	const sanitizedUserWithPagesLocalized = {
		...sanitizedUserWithPages,
		pages: sanitizedUserWithPages.pages.map((page) => ({
			...page,
			createdAt: new Date(page.createdAt).toLocaleDateString(locale),
		})),
	};
	return {
		sanitizedUserWithPages: sanitizedUserWithPagesLocalized,
		isOwner,
		totalPages: sanitizedUserWithPages.totalPages,
		currentPage: sanitizedUserWithPages.currentPage,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/login",
	});
	const formData = await request.formData();
	const intent = formData.get("intent");
	const pageId = formData.get("pageId");

	if (!pageId) {
		return { error: "Page ID is required" };
	}
	const page = await fetchPageById(Number(pageId));
	if (!page) {
		return { error: "Page not found" };
	}
	if (page.userId !== currentUser.id) {
		return { error: "Unauthorized" };
	}
	switch (intent) {
		case "togglePublish":
			return await togglePagePublicStatus(Number(pageId));
		case "archive":
			return await archivePage(Number(pageId));
		default:
			return { error: "Invalid action" };
	}
}

export default function UserPage() {
	const { sanitizedUserWithPages, isOwner, totalPages, currentPage } =
		useLoaderData<typeof loader>();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [pageToDelete, setPageToDelete] = useState<number | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();

	const fetcher = useFetcher();

	const togglePagePublicStatus = (pageId: number) => {
		fetcher.submit(
			{ intent: "togglePublish", pageId: pageId },
			{ method: "post" },
		);
	};

	const handleArchive = (pageId: number) => {
		setPageToDelete(pageId);
		setDialogOpen(true);
	};

	const confirmArchive = () => {
		if (pageToDelete) {
			fetcher.submit(
				{ intent: "archive", pageId: pageToDelete },
				{ method: "post" },
			);
		}
		setDialogOpen(false);
		setPageToDelete(null);
	};

	const handlePageChange = (newPage: number) => {
		setSearchParams({ page: newPage.toString() });
	};

	return (
		<div className="">
			<div className="mb-6 w-full overflow-hidden ">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className=" flex  justify-start">
						<Link to={`${sanitizedUserWithPages.icon}`}>
							<Avatar className="w-32 h-32">
								<AvatarImage
									src={sanitizedUserWithPages.icon}
									alt={sanitizedUserWithPages.displayName}
								/>
								<AvatarFallback>
									{sanitizedUserWithPages.displayName.charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</Link>
					</div>
					<div className="md:col-span-3">
						<CardHeader className="p-0">
							<CardTitle className="text-2xl font-bold flex justify-between items-center">
								<div>{sanitizedUserWithPages.displayName}</div>
								{isOwner && (
									<Link to={`/${sanitizedUserWithPages.userName}/edit`}>
										<Button variant="ghost">
											<Settings className="w-6 h-6" />
										</Button>
									</Link>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="break-all overflow-wrap-anywhere mt-2 p-0">
							<Linkify options={{ className: "underline" }}>
								{sanitizedUserWithPages.profile}
							</Linkify>
						</CardContent>
					</div>
				</div>
			</div>
			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{sanitizedUserWithPages.pages.map((page) => (
					<PageCard
						key={page.id}
						pageCard={page}
						pageLink={`/${sanitizedUserWithPages.userName}/page/${page.slug}`}
						userLink={`/${sanitizedUserWithPages.userName}`}
						showOwnerActions={isOwner}
						onTogglePublicStatus={togglePagePublicStatus}
						onArchive={handleArchive}
					/>
				))}
			</div>

			<div className="mt-8 flex justify-center">
				<Pagination className="mt-4">
					<PaginationContent className="w-full justify-between">
						<PaginationItem>
							<PaginationPrevious
								onClick={() => handlePageChange(currentPage - 1)}
								className={`${
									currentPage === 1 ? "pointer-events-none opacity-50" : ""
								}`}
							/>
						</PaginationItem>
						<div className="flex items-center space-x-2">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(pageNumber) => {
									if (
										pageNumber === 1 ||
										pageNumber === totalPages ||
										(pageNumber >= currentPage - 1 &&
											pageNumber <= currentPage + 1)
									) {
										return (
											<PaginationItem key={`page-${pageNumber}`}>
												<PaginationLink
													onClick={() => handlePageChange(pageNumber)}
													isActive={currentPage === pageNumber}
												>
													{pageNumber}
												</PaginationLink>
											</PaginationItem>
										);
									}
									if (
										pageNumber === currentPage - 2 ||
										pageNumber === currentPage + 2
									) {
										return (
											<PaginationEllipsis key={`ellipsis-${pageNumber}`} />
										);
									}
									return null;
								},
							)}
						</div>
						<PaginationItem>
							<PaginationNext
								onClick={() => handlePageChange(currentPage + 1)}
								className={
									currentPage === totalPages
										? "pointer-events-none opacity-50"
										: ""
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</div>

			{sanitizedUserWithPages.pages.length === 0 && (
				<p className="text-center text-gray-500 mt-10">
					{isOwner ? "You haven't created any pages yet." : "No pages yet."}
				</p>
			)}

			<DeletePageDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirm={confirmArchive}
			/>
		</div>
	);
}
