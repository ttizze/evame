import { describe, expect, it } from "vitest";
import { formDataValidator } from "./form-data-validator";

describe("formDataValidator", () => {
	it("FormDataを変換せず返し、重複した値とファイルを保つ", () => {
		const formData = new FormData();
		const file = new File(["image"], "photo.png", { type: "image/png" });
		formData.append("tags", "first");
		formData.append("tags", "second");
		formData.append("image", file);

		expect(formDataValidator(formData)).toBe(formData);
		expect(formData.getAll("tags")).toEqual(["first", "second"]);
		expect(formData.get("image")).toBe(file);
	});

	it.each([null, undefined, "title", 1, false, {}, [], new URLSearchParams()])(
		"FormDataではない値 %j を既存のエラー文言で拒否する",
		(value) => {
			expect(() => formDataValidator(value)).toThrow("Expected FormData");
		},
	);
});
