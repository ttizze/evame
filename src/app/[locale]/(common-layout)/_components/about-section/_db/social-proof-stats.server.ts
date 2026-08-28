import { cacheLife, cacheTag } from "next/cache";
import { querySocialProofStats } from "./queries";

export async function fetchSocialProofStats() {
	"use cache";
	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag("top:social-proof-stats");

	return querySocialProofStats();
}
