import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Authenticator, AuthorizationError } from "remix-auth";
import { EmailLinkStrategy } from "remix-auth-email-link";
import { FormStrategy } from "remix-auth-form";
import { GoogleStrategy } from "remix-auth-google";
import { sendMagicLink } from "~/routes/$locale+/auth/login/utils/send-magic-link.server";
import { prisma } from "./prisma";
import { sessionStorage } from "./session.server";

const SESSION_SECRET = process.env.SESSION_SECRET;
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET;

if (!SESSION_SECRET) {
	throw new Error("SESSION_SECRET is not defined");
}
if (!MAGIC_LINK_SECRET) {
	throw new Error("MAGIC_LINK_SECRET is not defined");
}

const authenticator = new Authenticator<User>(sessionStorage);

function generateTemporaryUserName() {
	return `new-${crypto.randomUUID().slice(0, 10)}-${new Date().toISOString().slice(0, 10)}`;
}

const formStrategy = new FormStrategy(async ({ form }) => {
	const email = form.get("email");
	const password = form.get("password");
	if (!email || !password) {
		throw new AuthorizationError("Email and password are required");
	}

	const existingUser = await prisma.user.findUnique({
		where: { email: String(email) },
		include: { credential: true },
	});
	if (
		!existingUser ||
		!existingUser.credential?.password ||
		existingUser.provider !== "Credentials"
	) {
		throw new AuthorizationError("Invalid login credentials");
	}
	const passwordsMatch = await bcrypt.compare(
		String(password),
		existingUser.credential.password,
	);
	if (!passwordsMatch) {
		throw new AuthorizationError("Invalid login credentials");
	}

	return existingUser;
});

authenticator.use(formStrategy, "user-pass");

const googleStrategy = new GoogleStrategy<User>(
	{
		clientID: process.env.GOOGLE_CLIENT_ID || "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		callbackURL: `${process.env.CLIENT_URL}/api/auth/callback/google`,
	},
	async ({ profile }) => {
		const user = await prisma.user.findUnique({
			where: { email: profile.emails[0].value },
		});
		if (user) {
			return user;
		}

		const newUser = await prisma.user.create({
			data: {
				email: profile.emails[0].value || "",
				userName: generateTemporaryUserName(),
				displayName: profile.displayName || "New User",
				icon: profile.photos[0].value || "",
				provider: "Google",
			},
		});
		return newUser;
	},
);
authenticator.use(googleStrategy);

const magicLinkStrategy = new EmailLinkStrategy(
	{
		sendEmail: sendMagicLink,
		secret: MAGIC_LINK_SECRET,
		callbackURL: "/auth/magic",
		sessionMagicLinkKey: "auth:magicLink",
	},
	async ({ email, form, magicLinkVerify }) => {
		const user = await prisma.user.findUnique({
			where: { email: String(email) },
		});

		if (user) {
			return user;
		}

		const newUser = await prisma.user.create({
			data: {
				email: String(email),
				icon: `${process.env.CLIENT_URL}/avatar.png`,
				userName: generateTemporaryUserName(),
				displayName: String(email).split("@")[0],
				provider: "MagicLink",
			},
		});

		return newUser;
	},
);

authenticator.use(magicLinkStrategy, "magicLink");

export { authenticator };
