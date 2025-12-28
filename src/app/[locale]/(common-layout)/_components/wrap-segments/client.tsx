"use client";

import type { JSX } from "react";
import { SegmentElementClient } from "./segment.client";
import type { SegmentForRender } from "./segment-for-render";
import { createWrapSegment } from "./wrap-segment.shared";

export function WrapSegmentClient<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	segments: SegmentForRender[],
	interactive: boolean = true,
) {
	return createWrapSegment({
		Tag,
		segments,
		interactive,
		SegmentElement: SegmentElementClient,
	});
}
