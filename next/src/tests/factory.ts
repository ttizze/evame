import type {
	PageCommentSegment,
	PageCommentSegmentTranslation,
	PageCommentWithPageCommentSegments,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/comment/_components/page-comment-list/_db/queries.server";
import type { Page, PageComment, PageStatus, User } from "@prisma/client";
import { Factory } from "fishery";
export const pageCommentSegmentTranslationFactory =
	Factory.define<PageCommentSegmentTranslation>(({ sequence }) => ({
		id: sequence,
		text: "Default segment text",
		locale: "en",
		userId: `user${sequence}`,
		pageCommentSegmentId: sequence,
		point: 0,
		createdAt: new Date(),
		updatedAt: new Date(),

		user: {
			handle: `user${sequence}`,
			name: `User ${sequence}`,
			image: `https://example.com/avatar${sequence}.png`,
			createdAt: new Date(),
			updatedAt: new Date(),
			profile: "Default profile",
			twitterHandle: "Default twitter handle",
			totalPoints: 0,
			isAI: false,
		},

		// ここは配列なので最初は空にしてもOK
		pageCommentSegmentTranslationVotes: [],
	}));

// --- (b) pageCommentSegment のファクトリー ---
export const pageCommentSegmentFactory = Factory.define<PageCommentSegment>(
	({ sequence, transientParams }) => ({
		id: sequence,
		number: sequence,
		text: "Default segment text",
		// 下位ファクトリーを利用して初期値を設定
		pageCommentSegmentTranslations: transientParams.customTranslations || [
			pageCommentSegmentTranslationFactory.build(),
		],
	}),
);

// --- (c) PageCommentWithPageCommentSegments のファクトリー ---
export const pageCommentWithPageCommentSegmentsFactory =
	Factory.define<PageCommentWithPageCommentSegments>(
		({ sequence, transientParams }) => ({
			// コメント本体
			id: sequence,
			parentId: null,
			pageId: 100,
			userId: `user${sequence}`,
			locale: "en",
			content: "Default comment content",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),

			// user情報
			user: {
				handle: `user${sequence}`,
				name: `User ${sequence}`,
				image: `https://example.com/avatar${sequence}.png`,
			},

			// セグメントを注入
			pageCommentSegments: transientParams.customSegments || [
				pageCommentSegmentFactory.build(),
			],

			// リプライ
			replies: [],
		}),
	);

export const pageFactory = Factory.define<Page>(({ sequence }) => ({
	id: sequence,
	content: `Page ${sequence}`,
	userId: `user${sequence}`,
	slug: `page-${sequence}`,
	sourceLocale: "en",
	status: "PUBLIC" as PageStatus,
	createdAt: new Date(),
	updatedAt: new Date(),
}));

export const pageCommentFactory = Factory.define<PageComment>(
	({ sequence }) => ({
		id: sequence,
		parentId: null,
		pageId: 100,
		userId: `user${sequence}`,
		locale: "en",
		content: "Default comment content",
		createdAt: new Date(),
		updatedAt: new Date(),
	}),
);

export const UserFactory = Factory.define<User>(({ sequence }) => ({
	id: `user${sequence}`,
	handle: `user${sequence}`,
	name: `User ${sequence}`,
	image: `https://example.com/avatar${sequence}.png`,
	createdAt: new Date(),
	updatedAt: new Date(),
	email: `user${sequence}@example.com`,
	profile: "Default profile",
	twitterHandle: "Default twitter handle",
	plan: "FREE",
	totalPoints: 0,
	isAI: false,
	provider: "google",
	emailVerified: new Date(),
}));
