import type { JSX } from "react";
import { Tweet as XPost } from "react-tweet";

export const SEGMENTABLE = [
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"td",
	"th",
	"blockquote",
] as const satisfies readonly (keyof JSX.IntrinsicElements)[];

export function TweetEmbed(props: { id: string }) {
	return (
		<span className="not-prose">
			<XPost id={props.id} />
		</span>
	);
}
