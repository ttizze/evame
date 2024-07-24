import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from "@remix-run/node";
import { useParams, useSearchParams } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { Header } from "~/components/Header";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/ui/pagination";
import { prisma } from "~/utils/prisma";
import { getTargetLanguage } from "~/utils/target-language.server";
import { authenticator } from "../../utils/auth.server";
import { TranslatedContent } from "./components/TranslatedContent";
import type { TranslationData } from "./types";
import { fetchLatestPageVersionWithTranslations } from "./utils";
import { splitContentByHeadings } from "./utils";
import { handleAddTranslationAction, handleVoteAction } from "./utils/actions";
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	const targetLanguage = await getTargetLanguage(request);

	const { encodedUrl } = params;
	if (!encodedUrl) {
		throw new Response("Missing URL parameter", { status: 400 });
	}
	const url = new URL(request.url);
	const page = Number.parseInt(url.searchParams.get("page") || "1", 10);

	const safeUser = await authenticator.isAuthenticated(request);
	const safeUserId = safeUser?.id;
	const fullPageVersion = await prisma.pageVersion.findFirst({
		where: { url: decodeURIComponent(encodedUrl) },
		orderBy: { createdAt: "desc" },
		select: { content: true },
	});
	if (!fullPageVersion) {
		throw new Response("Failed to fetch article", { status: 500 });
	}
	const sections = splitContentByHeadings(fullPageVersion.content);

	const currentSection = sections[page - 1];
	if (!currentSection) {
		throw new Response("Page not found", { status: 404 });
	}
	const currentNumbers = currentSection.dataNumber;

	const currentPageData = await fetchLatestPageVersionWithTranslations(
		decodeURIComponent(encodedUrl),
		safeUserId ?? 0,
		targetLanguage,
		currentNumbers,
	);

	if (!currentPageData) {
		throw new Response("Failed to fetch article", { status: 500 });
	}

	return typedjson({
		currentPageData,
		safeUser,
		currentPage: page,
		totalPages: sections.length,
		sectionHtml: currentSection.html,
		targetLanguage,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const safeUser = await authenticator.isAuthenticated(request);
	const safeUserId = safeUser?.id;
	const targetLanguage = await getTargetLanguage(request);

	if (!safeUserId) {
		return json({ error: "User not authenticated" }, { status: 401 });
	}

	const formData = await request.formData();
	const action = formData.get("action");

	switch (action) {
		case "vote":
			return handleVoteAction(formData, safeUserId);
		case "addTranslation":
			return handleAddTranslationAction(formData, safeUserId, targetLanguage);
		default:
			return json({ error: "Invalid action" }, { status: 400 });
	}
};

export default function ReaderView() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { encodedUrl } = useParams();
	const {
		currentPageData,
		safeUser,
		currentPage,
		totalPages,
		sectionHtml,
		targetLanguage,
	} = useTypedLoaderData<typeof loader>();

	const handlePageChange = (page: number) => {
		const newSearchParams = new URLSearchParams(searchParams);
		newSearchParams.set("page", page.toString());
		navigate(`/reader/${encodedUrl}?${newSearchParams.toString()}`);
	};
	const renderPaginationItems = () => {
		const items = [];

		// 最初のページへのリンク
		if (currentPage > 3) {
			items.push(
				<PaginationItem key="first">
					<PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
				</PaginationItem>,
			);
			if (currentPage > 4) {
				items.push(<PaginationEllipsis />);
			}
		}

		for (
			let i = Math.max(1, currentPage - 2);
			i <= Math.min(totalPages, currentPage + 2);
			i++
		) {
			items.push(
				<PaginationItem key={i}>
					<PaginationLink
						isActive={i === currentPage}
						onClick={() => handlePageChange(i)}
					>
						{i}
					</PaginationLink>
				</PaginationItem>,
			);
		}

		// 最後のページへのリンク
		if (currentPage < totalPages - 2) {
			if (currentPage < totalPages - 3) {
				items.push(
					<PaginationItem key="end-ellipsis">
						<PaginationEllipsis />
					</PaginationItem>,
				);
			}
			items.push(
				<PaginationItem key="last">
					<PaginationLink onClick={() => handlePageChange(totalPages)}>
						{totalPages}
					</PaginationLink>
				</PaginationItem>,
			);
		}

		return items;
	};

	const fetcher = useFetcher();

	if (!currentPageData) {
		return <div>Loading...</div>;
	}

	const originalUrl = encodedUrl ? decodeURIComponent(encodedUrl) : "";
	const handleVote = (translationId: number, isUpvote: boolean) => {
		fetcher.submit(
			{
				action: "vote",
				translateTextId: translationId.toString(),
				isUpvote: isUpvote ? "true" : "false",
			},
			{ method: "post" },
		);
	};

	const handleAddTranslation = (sourceTextId: number, text: string) => {
		fetcher.submit(
			{
				action: "addTranslation",
				sourceTextId: sourceTextId,
				text,
			},
			{ method: "post" },
		);
	};
	return (
		<div>
			<Header safeUser={safeUser} />
			<div className="container mx-auto px-4 py-8">
				<article className="prose dark:prose-invert lg:prose-xl mx-auto max-w-3xl">
					<h1>{currentPageData.title}</h1>
					<p>
						<a
							href={originalUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:underline"
						>
							Original Article
						</a>
					</p>
					<hr />
					<TranslatedContent
						content={sectionHtml}
						translations={
							currentPageData.translations as Array<{
								number: number;
								sourceTextId: number;
								translations: TranslationData[];
							}>
						}
						targetLanguage={targetLanguage}
						onVote={handleVote}
						onAdd={handleAddTranslation}
						userId={safeUser?.id ?? null}
					/>
					<div className="mt-8">
						<Pagination>
							<PaginationContent style={{ listStyleType: "none" }}>
								<PaginationItem>
									<PaginationPrevious href="#" />
								</PaginationItem>
								<PaginationItem>
									<PaginationLink href="#">1</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<PaginationLink href="#" isActive>
										2
									</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<PaginationLink href="#">3</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
								<PaginationItem>
									<PaginationNext href="#" />
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				</article>
			</div>
		</div>
	);
}
