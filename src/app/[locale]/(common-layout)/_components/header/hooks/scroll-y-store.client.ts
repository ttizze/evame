"use client";

type Subscriber = (scrollY: number) => void;

const subscribers = new Set<Subscriber>();
let rafId: number | null = null;
let latestScrollY = 0;
let isListening = false;

function notify() {
	for (const sub of subscribers) sub(latestScrollY);
}

function onScroll() {
	latestScrollY = window.scrollY;
	if (rafId !== null) return;
	rafId = window.requestAnimationFrame(() => {
		rafId = null;
		notify();
	});
}

function start() {
	if (isListening) return;
	isListening = true;
	latestScrollY = window.scrollY;
	window.addEventListener("scroll", onScroll, { passive: true });
}

function stop() {
	if (!isListening) return;
	isListening = false;
	window.removeEventListener("scroll", onScroll);
	if (rafId !== null) {
		window.cancelAnimationFrame(rafId);
		rafId = null;
	}
}

export function subscribeScrollY(subscriber: Subscriber) {
	subscribers.add(subscriber);
	if (subscribers.size === 1) start();

	// 取りこぼしを避けるため、登録直後に現在値を通知
	subscriber(typeof window === "undefined" ? 0 : window.scrollY);

	return () => {
		subscribers.delete(subscriber);
		if (subscribers.size === 0) stop();
	};
}
