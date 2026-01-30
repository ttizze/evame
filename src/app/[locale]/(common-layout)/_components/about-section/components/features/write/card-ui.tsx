"use client";

import { useEffect, useRef, useState } from "react";

const TITLE_TEXT = "Welcome!";
const CONTENT_TEXT = "Hello, world!";

function useTypewriter(
	text: string,
	speed: number = 100,
	startDelay: number = 0,
	loopDelay: number = 3000,
	enabled: boolean = true,
) {
	const [displayText, setDisplayText] = useState("");
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		if (!enabled) {
			setDisplayText("");
			setIsTyping(false);
			return;
		}

		const timeouts: NodeJS.Timeout[] = [];
		let charIndex = 0;

		const schedule = (fn: () => void, delay: number) => {
			const timeoutId = setTimeout(fn, delay);
			timeouts.push(timeoutId);
		};

		const startTyping = () => {
			setIsTyping(true);
			setDisplayText("");

			const typeNextChar = () => {
				if (charIndex < text.length) {
					setDisplayText(text.slice(0, charIndex + 1));
					charIndex++;
					schedule(typeNextChar, speed);
				} else {
					setIsTyping(false);
					schedule(() => {
						charIndex = 0;
						startTyping();
					}, loopDelay);
				}
			};
			typeNextChar();
		};

		schedule(startTyping, startDelay);

		return () => {
			timeouts.forEach((timeoutId) => {
				clearTimeout(timeoutId);
			});
		};
	}, [text, speed, startDelay, loopDelay, enabled]);

	return { displayText, isTyping };
}

export function WriteCardUI() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isActive, setIsActive] = useState(false);
	const { displayText: contentText, isTyping: isContentTyping } = useTypewriter(
		CONTENT_TEXT,
		80,
		500,
		2600,
		isActive,
	);

	useEffect(() => {
		const target = containerRef.current;
		if (!target) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsActive(entry.isIntersecting);
			},
			{
				rootMargin: "0px 0px -15% 0px",
				threshold: 0.35,
			},
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
			ref={containerRef}
		>
			<div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
				{TITLE_TEXT}
			</div>
			<div className="text-lg text-muted-foreground min-h-7">
				{contentText.length === 0 ? (
					<span className="text-muted-foreground/70">
						Write to the world...
					</span>
				) : (
					<span>{contentText}</span>
				)}
				{(isContentTyping || contentText.length === 0) && <Cursor />}
			</div>
		</div>
	);
}

function Cursor() {
	return (
		<span className="inline-block w-0.5 h-[1em] bg-blue-500 ml-0.5 animate-pulse align-text-bottom" />
	);
}
