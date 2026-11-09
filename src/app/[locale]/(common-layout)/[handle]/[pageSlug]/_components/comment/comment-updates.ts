import { createContext } from "react";

export const CommentUpdates = createContext<{
	commentsEnabled: boolean;
	refresh: (page: number | null) => Promise<void>;
}>({
	commentsEnabled: true,
	refresh: async () => {
		throw new Error("Comment updates require their owner");
	},
});
