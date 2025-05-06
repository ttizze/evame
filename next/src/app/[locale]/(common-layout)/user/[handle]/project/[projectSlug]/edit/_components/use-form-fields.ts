"use client";

import type { ProjectDetail } from "@/app/[locale]/types";
import { useMemo, useState } from "react";
import type { ProjectImage } from "../_db/mutations.server";

export interface ProjectLink {
	id?: number;
	url: string;
	description: string;
}

export function useProjectFormState(project: ProjectDetail) {
	/* ───────── 初期値 ───────── */
	const [tags, setTags] = useState<string[]>(
		project.projectTagRelations.map((r) => r.projectTag.name),
	);

	const [links, setLinks] = useState<ProjectLink[]>(
		(project.links as ProjectLink[]) ?? [],
	);

	const [images, setImages] = useState<ProjectImage[]>(
		project.images.filter(
			(img) => img.id !== project.iconImage?.id,
		) as ProjectImage[],
	);

	const [icon, setIcon] = useState<ProjectImage | null>(
		project.iconImage ?? null,
	);

	/* ───────── 派生値 ───────── */
	const tagLine = useMemo(
		() =>
			project.segmentBundles.find((b) => b.segment.number === 0)?.segment
				.text ?? "",
		[project],
	);

	/* ───────── 送信用ペイロード ───────── */
	const buildPayload = () => ({
		tagLine,
		tags,
		links,
		images,
		icon: icon ? { id: icon.id, url: icon.url } : null,
	});

	return {
		tagLine,
		tags,
		setTags,
		links,
		setLinks,
		images,
		setImages,
		icon,
		setIcon,
		buildPayload,
	};
}
