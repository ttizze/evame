export const CATEGORIES = ['title', 'user', 'tags', 'content'] as const;
export type Category = (typeof CATEGORIES)[number];
