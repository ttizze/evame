import { parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { z } from "zod";
import i18nServer from "~/i18n.server";
import { fetchGeminiApiKeyByUserName } from "~/routes/functions/queries.server";
import { authenticator } from "~/utils/auth.server";
import { togglePagePublicStatus } from "../functions/mutations.server";
import { PageManagementTab } from "./components/PageManagementTab";
import { archivePages } from "./functions/mutations.server";
import { fetchPaginatedOwnPages } from "./functions/queries.server";
const archiveSchema = z.object({
	pageIds: z.string().transform((val) => val.split(",").map(Number)),
	intent: z.literal("archive"),
});

const togglePublicSchema = z.object({
	pageId: z.string().transform(Number),
	intent: z.literal("togglePublic"),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});

	const geminiApiKey = await fetchGeminiApiKeyByUserName(currentUser.userName);
	const hasGeminiApiKey = !!geminiApiKey?.apiKey;
	let locale = params.locale;
	if (!locale) {
		locale = (await i18nServer.getLocale(request)) || "en";
	}
	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") || "1");
	const search = url.searchParams.get("search") || "";
	const { pagesWithTitle, totalPages, currentPage } =
		await fetchPaginatedOwnPages(currentUser.id, locale, page, 10, search);
	return {
		currentUser,
		hasGeminiApiKey,
		pagesWithTitle,
		totalPages,
		currentPage,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	await authenticator.isAuthenticated(request, {
		failureRedirect: "/",
	});
	const formData = await request.formData();

	if (formData.get("intent") === "archive") {
		const submission = parseWithZod(formData, {
			schema: archiveSchema,
		});

		if (submission.status !== "success") {
			return data(
				{ error: "Invalid submission" },
				{
					status: 400,
				},
			);
		}

		await archivePages(submission.value.pageIds);
		return data({ success: true });
	}

	if (formData.get("intent") === "togglePublic") {
		const submission = parseWithZod(formData, {
			schema: togglePublicSchema,
		});

		if (submission.status !== "success") {
			return data(
				{ error: "Invalid submission" },
				{
					status: 400,
				},
			);
		}

		await togglePagePublicStatus(submission.value.pageId);
		return data({ success: true });
	}

	return null;
}

export default function PageManagementPage() {
	const { pagesWithTitle, totalPages, currentPage, currentUser } =
		useLoaderData<typeof loader>();

	return (
		<div className="mx-auto max-w-4xl py-10">
			{/* <Tabs defaultValue="page-management" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="page-management">Management</TabsTrigger>
					<TabsTrigger value="folder-upload">Folder</TabsTrigger>
					<TabsTrigger value="github-integration">GitHub</TabsTrigger>
				</TabsList> */}

			{/* <TabsContent value="page-management"> */}
			<PageManagementTab
				pagesWithTitle={pagesWithTitle}
				totalPages={totalPages}
				currentPage={currentPage}
				userName={currentUser.userName}
			/>
			{/* </TabsContent> */}

			{/* <TabsContent value="folder-upload">
					{hasGeminiApiKey ? (
						<FolderUploadTab />
					) : (
						<div className="p-4 text-center text-red-500">
							Gemini API key is not set
						</div>
					)}
				</TabsContent>

				<TabsContent value="github-integration">
					<GitHubIntegrationTab />
				</TabsContent> */}
			{/* </Tabs> */}
		</div>
	);
}
