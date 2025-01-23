import type { LoaderFunctionArgs } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
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
import { fetchUserByHandle } from "~/routes/functions/queries.server";
import { isFollowing } from "~/routes/resources+/follow-button/db/queries.server";
import { FollowButton } from "~/routes/resources+/follow-button/route";
import { authenticator } from "~/utils/auth.server";
import { ensureGuestId } from "~/utils/ensureGuestId.server";
import { commitSession } from "~/utils/session.server";
import { fetchPaginatedPublicPagesWithInfo } from "../functions/queries.server";
import { DeletePageDialog } from "./components/DeletePageDialog";
import { FollowListDialog } from "./components/FollowListDialog";
import {
	archivePage,
	togglePagePublicStatus,
	} from "./functions/mutations.server";
	import {
	fetchFollowerList,
	fetchFollowingList,
	getFollowCounts,
} from "./functions/queries.server";
import { fetchPageById } from "./functions/queries.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return [{ title: "Profile" }];
	}
	return [{ title: data.pageOwner.name }];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	let locale = params.locale;
	if (!locale) {
		locale = (await i18nServer.getLocale(request)) || "en";
	}
	const { handle } = params;
	if (!handle) throw new Error("handle is required");

	const pageOwner = await fetchUserByHandle(handle);
	console.log(pageOwner?.handle);
	if (!pageOwner) {
		throw new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") || "1");
	const pageSize = 9;

	const currentUser = await authenticator.isAuthenticated(request);
	console.log(currentUser?.handle);
	const { session, guestId } = await ensureGuestId(request);

	const isOwner = currentUser?.handle === handle;
	console.log(isOwner);

	const { pagesWithInfo, totalPages, currentPage } =
		await fetchPaginatedPublicPagesWithInfo({
			page,
			pageSize,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			pageOwnerId: pageOwner.id,
			onlyUserOwn: true,
			locale,
		});
	if (!pagesWithInfo) throw new Response("Not Found", { status: 404 });
	const followCounts = await getFollowCounts(pageOwner.id);
	const followerList = await fetchFollowerList(pageOwner.id);
	const followingList = await fetchFollowingList(pageOwner.id);
	const isCurrentUserFollowing = currentUser
		? await isFollowing(currentUser.id, pageOwner.id)
		: false;
	const headers = new Headers();
	headers.set("Set-Cookie", await commitSession(session));

	return data(
		{
			pagesWithInfo,
			isOwner,
			totalPages,
			currentPage,
			pageOwner,
			followCounts,
			isCurrentUserFollowing,
			followerList,
			followingList,
		},
		{
			headers,
		},
	);
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
	const {
		pagesWithInfo,
		isOwner,
		totalPages,
		currentPage,
		pageOwner,
		followCounts,
		isCurrentUserFollowing,
		followerList,
		followingList,
	} = useLoaderData<typeof loader>();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [pageToDelete, setPageToDelete] = useState<number | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const [openFollowers, setOpenFollowers] = useState<boolean>(false);
	const [openFollowing, setOpenFollowing] = useState<boolean>(false);

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
							<Link to={`${pageOwner.icon}`}>
								<Avatar className="w-20 h-20 md:w-24 md:h-24">
									<AvatarImage
										src={pageOwner.icon}
										alt={pageOwner.name}
									/>
									<AvatarFallback>
										{pageOwner.name.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</Link>
						</div>
						<div className="mt-2 md:mt-0 md:ml-4 flex items-center justify-between w-full">
							<div>
								<CardTitle className="text-xl md:text-2xl font-bold">
									{pageOwner.name}
								</CardTitle>
								<div>
									<CardDescription className="text-sm text-gray-500">
										@{pageOwner.handle}
									</CardDescription>
									<div className="flex gap-4 mt-2 text-sm text-gray-500">
										<span
											onClick={() => setOpenFollowing(true)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													setOpenFollowing(true);
												}
											}}
											className="cursor-pointer"
										>
											{followCounts.following} following
										</span>
										<span
											onClick={() => setOpenFollowers(true)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													setOpenFollowers(true);
												}
											}}
											className="cursor-pointer"
										>
											{followCounts.followers} followers
										</span>
									</div>
									<FollowListDialog
										open={openFollowing}
										onOpenChange={setOpenFollowing}
										users={followingList.map((item) => item.following)}
										type="following"
									/>

									{/* フォロワー一覧ダイアログ */}
									<FollowListDialog
										open={openFollowers}
										onOpenChange={setOpenFollowers}
										users={followerList.map((item) => item.follower)}
										type="followers"
									/>
								</div>
							</div>

							{isOwner ? (
								<LocaleLink to={`/user/${pageOwner.handle}/edit`}>
									<Button
										variant="secondary"
										className="flex items-center rounded-full"
									>
										<Settings className="w-4 h-4" />
										<span className="ml-2 text-sm">Edit Profile</span>
									</Button>
								</LocaleLink>
							) : (
								<FollowButton
									targetUserId={pageOwner.id}
									isFollowing={isCurrentUserFollowing}
									className="rounded-full"
								/>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="mt-4">
					<Linkify options={{ className: "underline" }}>
						{pageOwner.profile}
					</Linkify>
				</CardContent>
			</Card>

			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{pagesWithInfo.map((page) => (
					<PageCard
						key={page.id}
						pageCard={page}
						pageLink={`/user/${pageOwner.handle}/page/${page.slug}`}
						userLink={`/user/${pageOwner.handle}`}
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
