import type { AdapterUser as CoreAdapterUser } from "@auth/core/adapters";
// next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "@auth/core/adapters" {
	interface AdapterUser extends CoreAdapterUser {
		handle: string;
		profile: string;
		twitterHandle: string;
		createdAt: Date;
		updatedAt: Date;
		totalPoints: number;
		isAI: boolean;
		name: string;
		image: string;
		plan: string;
	}
}

declare module "next-auth" {
	interface User extends DefaultUser {
		handle: string;
		profile: string;
		twitterHandle: string;
		createdAt: Date;
		updatedAt: Date;
		totalPoints: number;
		isAI: boolean;
		name: string;
		image: string;
		plan: string;
	}
	interface Session {
		user: DefaultSession["user"] & {
			handle: string;
			profile: string;
			twitterHandle: string;
			createdAt: Date;
			updatedAt: Date;
			totalPoints: number;
			isAI: boolean;
			name: string;
			image: string;
		};
	}
}
