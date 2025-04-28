import { prisma } from "@/lib/prisma";

export async function getNotifications(currentUserHandle: string) {
	return prisma.notification.findMany({
		where: { user: { handle: currentUserHandle } },
		include: {
			user: { select: { handle: true, image: true, name: true } },
			actor: { select: { handle: true, image: true, name: true } },
			page: {
				select: {
					slug: true,
					pageSegments: {
						where: { number: 0 },
						select: { text: true },
					},
				},
			},
			pageComment: {
				select: {
					page: {
						select: {
							slug: true,
							pageSegments: {
								where: { number: 0 },
								select: { text: true },
							},
						},
					},
				},
			},
			pageSegmentTranslation: {
				select: {
					text: true,
					pageSegment: {
						select: {
							text: true,
							page: {
								select: {
									slug: true,
									user: { select: { handle: true } },
									pageSegments: {
										where: { number: 0 },
										select: { text: true },
									},
								},
							},
						},
					},
				},
			},
			pageCommentSegmentTranslation: {
				select: {
					text: true,
					pageCommentSegment: {
						select: {
							text: true,
							pageComment: {
								select: {
									page: {
										select: {
											slug: true,
											user: { select: { handle: true } },
											pageSegments: {
												where: { number: 0 },
												select: { text: true },
											},
										},
									},
								},
							},
						},
					},
				},
			},
			project: {
				select: {
					slug: true,
					title: true,
				},
			},
			projectComment: {
				select: {
					project: {
						select: { slug: true, title: true },
					},
				},
			},
			projectSegmentTranslation: {
				select: {
					text: true,
					projectSegment: {
						select: {
							text: true,
							project: {
								select: {
									slug: true,
									title: true,
									user: { select: { handle: true } },
								},
							},
						},
					},
				},
			},
			projectCommentSegmentTranslation: {
				select: {
					text: true,
					projectCommentSegment: {
						select: {
							text: true,
							projectComment: {
								select: {
									project: {
										select: {
											slug: true,
											title: true,
											user: { select: { handle: true } },
										},
									},
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
}

export type NotificationWithRelations = Awaited<
	ReturnType<typeof getNotifications>
>[number];
