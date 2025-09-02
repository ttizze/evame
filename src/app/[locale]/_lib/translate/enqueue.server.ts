import { BASE_URL } from "@/app/_constants/base-url";
import type { TranslateJobParams } from "../../../api/translate/types";

type Options = {
	dedupe?: string;
	retries?: number;
	retryDelay?: string;
	timeout?: number;
};

export async function enqueueTranslate(
	body: TranslateJobParams,
	options: Options = {},
) {
	const { Client } = await import("@upstash/qstash");
	const client = new Client({ token: process.env.QSTASH_TOKEN });

	// When running QStash in a Docker container (dev), localhost inside the
	// container does not point to the host's Next.js server. Allow overriding
	// the publish target with QSTASH_PUBLISH_BASE_URL (e.g. http://host.docker.internal:3000)
	const publishBaseUrl =
		process.env.QSTASH_PUBLISH_BASE_URL?.trim() || BASE_URL;

	return client.publishJSON({
		url: `${publishBaseUrl}/api/translate`,
		body,
		// QStash does not allow ':' in deduplicationId
		deduplicationId: options.dedupe ?? `translate-${body.translationJobId}`,
		retries: options.retries ?? 5,
		retryDelay: options.retryDelay ?? "10000",
		timeout: 240,
	});
}
