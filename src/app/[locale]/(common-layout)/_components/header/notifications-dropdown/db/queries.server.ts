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
					content: {
						select: {
							segments: {
								where: { number: 0 },
								select: { text: true },
							},
						},
					},
				},
			},
			pageComment: {
				select: {
					page: {
						select: {
							slug: true,
							content: {
								select: {
									segments: {
										where: { number: 0 },
										select: { text: true },
									},
								},
							},
						},
					},
				},
			},
			segmentTranslation: {
				select: {
					text: true,
					segment: {
						select: {
							text: true,
							content: {
								select: {
									page: {
										select: {
											slug: true,
											user: { select: { handle: true } },
											content: {
												select: {
													segments: {
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
