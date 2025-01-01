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
import { LocaleLink } from "~/components/LocaleLink";
import { PageCard } from "~/components/PageCard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Card } from "~/components/ui/card";
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
import { fetchUserByUserName } from "~/routes/functions/queries.server";
import { authenticator } from "~/utils/auth.server";
import { sanitizeUser } from "~/utils/sanitizeUser";
import { getSession } from "~/utils/session.server";
import { fetchPaginatedPagesWithInfo } from "../functions/queries.server";
import { DeletePageDialog } from "./components/DeletePageDialog";
import {
	archivePage,
	togglePagePublicStatus,
} from "./functions/mutations.server";
import { fetchPageById } from "./functions/queries.server";
import { redirect } from "@remix-run/node";
import { commitSession } from "~/utils/session.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return [{ title: "Profile" }];
	}
	return [{ title: data.sanitizedUser.displayName }];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	let locale = params.locale;
	if (!locale) {
		locale = (await i18nServer.getLocale(request)) || "en";
	}
	const { userName } = params;
	if (!userName) throw new Error("Username is required");

	const nonSanitizedUser = await fetchUserByUserName(userName);
	if (!nonSanitizedUser) {
		throw new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") || "1");
	const pageSize = 9;

	const currentUser = await authenticator.isAuthenticated(request);
	const session = await getSession(request.headers.get("Cookie"));
	let guestId = session.get("guestId");
	if (!currentUser && !guestId) {
		guestId = crypto.randomUUID();
		session.set("guestId", guestId);
		return redirect(request.url, {
			headers: { "Set-Cookie": await commitSession(session) },
		});
	}
	const isOwner = currentUser?.userName === userName;

	const { pagesWithInfo, totalPages, currentPage } =
		await fetchPaginatedPagesWithInfo({
			page,
			pageSize,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			pageOwnerId: nonSanitizedUser.id,
			onlyUserOwn: true,
			locale,
		});
	if (!pagesWithInfo) throw new Response("Not Found", { status: 404 });
	const sanitizedUser = await sanitizeUser(nonSanitizedUser);

	return {
		pagesWithInfo,
		isOwner,
		totalPages,
		currentPage,
		sanitizedUser,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
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
	const { pagesWithInfo, isOwner, totalPages, currentPage, sanitizedUser } =
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
		<div>
			<Card className="mb-8">
				<CardHeader className="pb-4">
					<div className="flex w-full flex-col md:flex-row">
						<div>
							<Link to={`${sanitizedUser.icon}`}>
								<Avatar className="w-20 h-20 md:w-24 md:h-24">
									<AvatarImage
										src={sanitizedUser.icon}
										alt={sanitizedUser.displayName}
									/>
									<AvatarFallback>
										{sanitizedUser.displayName.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</Link>
						</div>
						<div className="mt-2 md:mt-0 md:ml-4 flex items-center justify-between w-full">
							<div>
								<CardTitle className="text-xl md:text-2xl font-bold">
									{sanitizedUser.displayName}
								</CardTitle>
								<CardDescription className="text-sm text-gray-500">
									@{sanitizedUser.userName}
								</CardDescription>
							</div>

							{isOwner && (
								<LocaleLink to={`/user/${sanitizedUser.userName}/edit`}>
									<Button
										variant="secondary"
										className="flex items-center rounded-full"
									>
										<Settings className="w-4 h-4" />
										<span className="ml-2 text-sm">Edit Profile</span>
									</Button>
								</LocaleLink>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="mt-4">
					<Linkify options={{ className: "underline" }}>
						{sanitizedUser.profile}
					</Linkify>
				</CardContent>
			</Card>

			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{pagesWithInfo.map((page) => (
					<PageCard
						key={page.id}
						pageCard={page}
						pageLink={`/user/${sanitizedUser.userName}/page/${page.slug}`}
						userLink={`/user/${sanitizedUser.userName}`}
						showOwnerActions={isOwner}
						onTogglePublicStatus={togglePagePublicStatus}
						onArchive={handleArchive}
					/>
				))}
			</div>

			{pagesWithInfo.length > 0 && (
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
									className={`${
										currentPage === totalPages
											? "pointer-events-none opacity-50"
											: ""
									}`}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}

			{pagesWithInfo.length === 0 && (
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
