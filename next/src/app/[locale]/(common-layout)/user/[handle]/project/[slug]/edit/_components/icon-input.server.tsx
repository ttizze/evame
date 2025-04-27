import { type ProjectImage, ProjectImageInput } from "./image-input/index";

interface ProjectIconInputProps {
	initialIcon: ProjectImage | null;
	onChange: (icon: ProjectImage | null) => void;
}

export function ProjectIconInput({
	initialIcon,
	onChange,
}: ProjectIconInputProps) {
	return (
		<ProjectImageInput
			initialImages={initialIcon ? [initialIcon] : []}
			onChange={(imgs) => onChange(imgs[0] ?? null)}
			maxImages={1}
			hideReorder
			showCaption={false}
		/>
	);
}
