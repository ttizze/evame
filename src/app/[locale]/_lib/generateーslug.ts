import { customAlphabet } from "nanoid";

export const generateSlug = () =>
	customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)();
