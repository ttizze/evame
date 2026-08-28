import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import { findPageIdBySegmentTranslationId } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/_db/queries.server";
import { addTranslationService } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/add-translation-form/service/add-translation.server";
import {
	createNotificationPageSegmentTranslationVote,
	handleVote,
} from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/vote-buttons/db/mutation.server";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { db } from "@/db";
import { segmentTranslationSchema } from "./_domain/segment-translations";

const getSchema = z.object({
	segmentId: z.coerce.number().int(),
	userLocale: z.string(),
});

const postSchema = z.object({
	locale: z.string(),
	segmentId: z.coerce.number(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
});

const patchSchema = z.object({
	segmentTranslationId: z.coerce.number().int(),
	isUpvote: z.string().transform((val) => val === "true"),
});

export async function getSegmentTranslations(
	request: Request,
): Promise<Response> {
	const validation = getSchema.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);

	if (!validation.success) {
		return Response.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { segmentId, userLocale } = validation.data;
	const currentUser = await getCurrentUserFromHeaders(request.headers);

	try {
		const translations = await db
			.selectFrom("segmentTranslations as st")
			.innerJoin("segments as s", "st.segmentId", "s.id")
			.innerJoin("contents", "s.contentId", "contents.id")
			.leftJoin("pages as p", "s.contentId", "p.id")
			.innerJoin("users as u", "st.userId", "u.id")
			.leftJoin("translationVotes as tv", (join) =>
				join
					.onRef("tv.translationId", "=", "st.id")
					.on("tv.userId", "=", currentUser?.id ?? ""),
			)
			.leftJoin("translationVotes as pageOwnerTv", (join) =>
				join
					.onRef("pageOwnerTv.translationId", "=", "st.id")
					.onRef("pageOwnerTv.userId", "=", "p.userId")
					.on("pageOwnerTv.isUpvote", "=", true),
			)
			.select([
				"st.id",
				"st.segmentId",
				"st.locale",
				"st.text",
				"st.point",
				"st.createdAt",
				"u.name as userName",
				"u.handle as userHandle",
				"tv.isUpvote as currentUserVoteIsUpvote",
				"pageOwnerTv.isUpvote as ownerUpvote",
			])
			.where("st.segmentId", "=", segmentId)
			.where("st.locale", "=", userLocale)
			.where("contents.kind", "=", "PAGE")
			.orderBy("ownerUpvote", (ob) => ob.desc().nullsLast())
			.orderBy("st.point", "desc")
			.orderBy("st.createdAt", "desc")
			.execute();

		const response = segmentTranslationSchema.array().parse(translations);
		return Response.json(response);
	} catch (error) {
		console.error("Error fetching translations:", error);
		return Response.json(
			{ error: "Failed to fetch translations" },
			{ status: 500 },
		);
	}
}

export async function postSegmentTranslation(request: Request) {
	if (!isSameOriginRequest(request)) {
		return {
			response: Response.json({ error: "Forbidden" }, { status: 403 }),
		};
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return {
			response: Response.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return {
			response: Response.json(
				{ success: false, message: "Invalid form data" },
				{ status: 400 },
			),
		};
	}

	const parsed = await parseFormData(postSchema, formData);
	if (!parsed.success) {
		return {
			response: Response.json(
				{
					success: false,
					zodErrors: parsed.error.flatten().fieldErrors,
				},
				{ status: 400 },
			),
		};
	}

	const result = await addTranslationService(
		parsed.data.segmentId,
		parsed.data.text,
		currentUser.id,
		parsed.data.locale,
	);

	if (!result.success) {
		return {
			response: Response.json({ success: false, message: result.message }),
		};
	}

	return {
		response: Response.json({ success: true }),
		pageId: result.pageId,
	};
}

export async function patchSegmentTranslationVote(request: Request) {
	if (!isSameOriginRequest(request)) {
		return {
			response: Response.json({ error: "Forbidden" }, { status: 403 }),
		};
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return {
			response: Response.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return {
			response: Response.json(
				{ success: false, message: "Invalid form data" },
				{ status: 400 },
			),
		};
	}

	const parsed = await parseFormData(patchSchema, formData);
	if (!parsed.success) {
		return {
			response: Response.json(
				{
					success: false,
					zodErrors: parsed.error.flatten().fieldErrors,
				},
				{ status: 400 },
			),
		};
	}

	const { segmentTranslationId, isUpvote } = parsed.data;
	const result = await handleVote(
		segmentTranslationId,
		isUpvote,
		currentUser.id,
	);

	if (result.data.isUpvote) {
		await createNotificationPageSegmentTranslationVote(
			segmentTranslationId,
			currentUser.id,
		);
	}

	const pageId = await findPageIdBySegmentTranslationId(segmentTranslationId);
	return {
		response: Response.json({ success: true, data: result.data }),
		pageId,
	};
}
