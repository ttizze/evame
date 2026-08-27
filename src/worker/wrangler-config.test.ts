import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRANSLATION_DEAD_LETTER_QUEUE_NAME } from "./translation-queue";

const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as {
	queues: {
		producers: Array<{ binding: string; queue: string }>;
		consumers: Array<{
			queue: string;
			max_retries?: number;
			dead_letter_queue?: string;
		}>;
	};
};

describe("Cloudflare Queueの設定", () => {
	it("通常QueueをTRANSLATION_QUEUE producer bindingに割り当てる", () => {
		expect(config.queues.producers).toContainEqual({
			binding: "TRANSLATION_QUEUE",
			queue: "digital-buddhism-translations",
		});
	});

	it("通常QueueはDLQへ送り、DLQ consumerは再帰DLQを持たない", () => {
		const normalConsumer = config.queues.consumers.find(
			(consumer) => consumer.queue === "digital-buddhism-translations",
		);
		const deadLetterConsumer = config.queues.consumers.find(
			(consumer) => consumer.queue === TRANSLATION_DEAD_LETTER_QUEUE_NAME,
		);

		expect(normalConsumer).toMatchObject({
			max_retries: 3,
			dead_letter_queue: TRANSLATION_DEAD_LETTER_QUEUE_NAME,
		});
		expect(deadLetterConsumer).toBeDefined();
		expect(deadLetterConsumer).not.toHaveProperty("dead_letter_queue");
	});
});
