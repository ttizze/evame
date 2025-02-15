import { Queue as BullQueue, type Job, type Processor, Worker } from "bullmq";
import { RedisConfig } from "./redis-config";

type RegisteredQueue = {
	queue: BullQueue;
	worker: Worker;
	version: number;
};

declare global {
	var __registeredQueues: Record<string, RegisteredQueue> | undefined;
}

if (!global.__registeredQueues) {
	global.__registeredQueues = {};
}
const registeredQueues = global.__registeredQueues;

export function Queue<Payload extends object>(
	name: string,
	version: number,
	handlers: {
		processor: Processor<Payload>;
		onComplete: (job: Job<Payload>, queue: BullQueue<Payload>) => void;
	},
): BullQueue<Payload> {
	if (registeredQueues[name] && registeredQueues[name].version === version) {
		return registeredQueues[name].queue as BullQueue<Payload>;
	}

	if (registeredQueues[name]) {
		registeredQueues[name].worker.close();
	}
	const queue = new BullQueue<Payload, Payload, string>(name, {
		connection: RedisConfig,
	});
	const worker = new Worker<Payload>(name, handlers.processor, {
		connection: RedisConfig,
	});
	worker.on("completed", (job) => handlers.onComplete(job, queue));

	registeredQueues[name] = { queue, worker, version };
	return queue;
}
