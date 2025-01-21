import type { User } from "@prisma/client";
import { createCookieSessionStorage } from "@remix-run/node";

type Session = {
	user?: User;
	guestId?: string;
};

if (!process.env.SESSION_SECRET) {
	throw new Error("SESSION_SECRET is not defined");
}

export const sessionStorage = createCookieSessionStorage<Session>({
	cookie: {
		name: "_session",
		sameSite: "lax",
		path: "/",
		httpOnly: true,
		secrets: [process.env.SESSION_SECRET],
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 30,
	},
});

export const { getSession, commitSession, destroySession } = sessionStorage;
