import bcrypt from "bcryptjs";
import { Authenticator, AuthorizationError } from "remix-auth";
import { EmailLinkStrategy } from "remix-auth-email-link";
import { FormStrategy } from "remix-auth-form";
import { GoogleStrategy } from "remix-auth-google";
import { sendMagicLink } from "~/routes/$locale+/auth/login/utils/send-magic-link.server";
import type { SanitizedUser } from "../types";
import { prisma } from "./prisma";
import { sanitizeUser } from "./sanitizeUser";
import { sessionStorage } from "./session.server";

const SESSION_SECRET = process.env.SESSION_SECRET;
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET;

if (!SESSION_SECRET) {
	throw new Error("SESSION_SECRET is not defined");
}
if (!MAGIC_LINK_SECRET) {
	throw new Error("MAGIC_LINK_SECRET is not defined");
}

const authenticator = new Authenticator<SanitizedUser>(sessionStorage);

function generateTemporaryHandle() {
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

	return sanitizeUser(existingUser);
});

authenticator.use(formStrategy, "user-pass");

const googleStrategy = new GoogleStrategy<SanitizedUser>(
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
			return sanitizeUser(user);
		}

		const newUser = await prisma.user.create({
			data: {
				email: profile.emails[0].value,
				handle: generateTemporaryHandle(),
				name: profile.displayName || "New User",
				image: profile.photos[0].value || "",
				provider: "Google",
			},
		});
		return sanitizeUser(newUser);
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
			return sanitizeUser(user);
		}

		const newUser = await prisma.user.create({
			data: {
				email: String(email),
				image: `${process.env.CLIENT_URL}/avatar.png`,
				handle: generateTemporaryHandle(),
				name: String(email).split("@")[0],
				provider: "MagicLink",
			},
		});

		return sanitizeUser(newUser);
	},
);

authenticator.use(magicLinkStrategy, "magicLink");

export { authenticator };
