export const targetContentTypeValues = ["page", "pageComment"] as const;

/* 2) TypeScript 型 ─ 配列から自動導出 */
export type TargetContentType = (typeof targetContentTypeValues)[number];
