import type { FetchPaginatedPublicPagesReturn } from "./home/functions/queries.server";

export type OriginalPageCardType =
	FetchPaginatedPublicPagesReturn["pagesWithInfo"][number];

export type PageCardType = Omit<OriginalPageCardType, "createdAt"> & {
	createdAt: string;
};
