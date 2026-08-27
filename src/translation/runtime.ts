import type { TranslationQueue } from "./types";

let configuredTranslationQueue: TranslationQueue | undefined;

/** HTTP入口からQueue bindingを使うための起動時注入。binding自体は保持し、秘密値は保持しない。 */
export function configureTranslationQueue(queue: TranslationQueue): void {
	configuredTranslationQueue = queue;
}

export function getTranslationQueue(): TranslationQueue {
	if (!configuredTranslationQueue) {
		throw new Error("翻訳Queueが設定されていません");
	}
	return configuredTranslationQueue;
}
