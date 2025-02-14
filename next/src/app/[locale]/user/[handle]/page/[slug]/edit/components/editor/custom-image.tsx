import { Image } from "@tiptap/extension-image";

export const CustomImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			"data-uploading-id": {
				default: null,
				parseHTML: (element) => element.getAttribute("data-uploading-id"),
				renderHTML: (attributes) => {
					return attributes["data-uploading-id"] ? { "data-uploading-id": attributes["data-uploading-id"] } : {};
				},
			},
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
