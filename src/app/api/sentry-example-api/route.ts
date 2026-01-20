import { connection } from "next/server";

// A faulty API route to test Sentry's error monitoring
export async function GET() {
	await connection();
	throw new Error("Sentry Example API Route Error");
}
