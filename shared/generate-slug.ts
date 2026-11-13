import { customAlphabet } from "nanoid";

export const generateSlug: () => string = customAlphabet(
	"0123456789abcdefghijklmnopqrstuvwxyz",
	12,
);
