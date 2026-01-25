"use client";

import { useEffect, useState } from "react";

const TITLE_TEXT = "Welcome!";
const CONTENT_TEXT = "Hello, world!";

function useTypewriter(
	text: string,
	speed: number = 100,
	startDelay: number = 0,
	loopDelay: number = 3000,
) {
	const [displayText, setDisplayText] = useState("");
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		let timeout: NodeJS.Timeout;
		let charIndex = 0;

		const startTyping = () => {
			setIsTyping(true);
			setDisplayText("");

			const typeNextChar = () => {
				if (charIndex < text.length) {
					setDisplayText(text.slice(0, charIndex + 1));
					charIndex++;
					timeout = setTimeout(typeNextChar, speed);
				} else {
					setIsTyping(false);
					timeout = setTimeout(() => {
						charIndex = 0;
						startTyping();
					}, loopDelay);
				}
			};
			typeNextChar();
		};

		timeout = setTimeout(startTyping, startDelay);

		return () => clearTimeout(timeout);
	}, [text, speed, startDelay, loopDelay]);

	return { displayText, isTyping };
}

export function WriteCardUI() {
	const { displayText: contentText, isTyping: isContentTyping } = useTypewriter(
		CONTENT_TEXT,
		80,
		500,
	);

	return (
		<div className="mt-5 p-4 rounded-xl bg-gray-100 dark:bg-zinc-800/50">
			<div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
				{TITLE_TEXT}
			</div>
			<div className="text-lg text-slate-700 dark:text-slate-300 min-h-7">
				{contentText.length === 0 ? (
					<span className="text-slate-400 dark:text-slate-500">
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
