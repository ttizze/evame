import { createContext } from "react";

export const CommentUpdates = createContext<
	(page: number | null) => Promise<void>
>(async () => {
	throw new Error("Comment updates require their owner");
});
