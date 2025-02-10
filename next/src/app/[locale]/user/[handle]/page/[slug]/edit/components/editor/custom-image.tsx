import { Image } from "@tiptap/extension-image";

export const CustomImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default: null,
				parseHTML: (element) => element.getAttribute("width"),
				renderHTML: (attributes) => {
					return attributes.width ? { width: String(attributes.width) } : {};
				},
			},
			height: {
				default: null,
				parseHTML: (element) => element.getAttribute("height"),
				renderHTML: (attributes) => {
					return attributes.height ? { height: String(attributes.height) } : {};
				},
			},
		};
	},
});
