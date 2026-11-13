export function formDataValidator(value: unknown) {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
}
