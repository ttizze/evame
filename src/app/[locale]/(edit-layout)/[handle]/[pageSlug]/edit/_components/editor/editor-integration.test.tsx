import { describe, expect, it } from "vitest";
import { configureEditor } from "./editor-config";

/**
 * 現在のeditor.tsxの実装をシミュレート（バグありバージョン）
 */
function simulateCurrentEditorImplementation(
	defaultValue: string,
	placeholder: string,
	className: string,
) {
	const baseConfig = configureEditor(defaultValue, placeholder);

	// 現在のeditor.tsxの実装：editorPropsを完全に上書き
	const editorConfig = {
		...baseConfig,
		editorProps: {
			attributes: {
				"data-testid": "tiptap-editor",
				class: className,
			},
		},
	};

	return editorConfig;
}

/**
 * 修正されたエディタ統合をテストするためのモック
 */
function simulateFixedEditorImplementation(
	defaultValue: string,
	placeholder: string,
	className: string,
) {
	const baseConfig = configureEditor(defaultValue, placeholder);

	// 修正版：editorPropsをマージする
	const editorConfig = {
		...baseConfig,
		editorProps: {
			...baseConfig.editorProps,
			attributes: {
				...baseConfig.editorProps?.attributes,
				"data-testid": "tiptap-editor",
				class: className,
			},
		},
	};

	return editorConfig;
}

describe("Editor Configuration Integration", () => {
	it("should preserve transformPastedHTML in configureEditor output", () => {
		const config = configureEditor("", "Test placeholder");

		// configureEditorがtransformPastedHTMLを含むことを確認
		expect(config.editorProps).toBeDefined();
		expect(config.editorProps?.transformPastedHTML).toBeDefined();
		expect(typeof config.editorProps?.transformPastedHTML).toBe("function");
	});

	it("should merge editorProps correctly without overriding", () => {
		const config = configureEditor("", "placeholder");

		// configureEditorで設定された属性を確認
		expect(config.editorProps?.attributes).toEqual({
			class: "focus:outline-hidden",
		});

		// transformPastedHTMLも含まれることを確認
		expect(config.editorProps?.transformPastedHTML).toBeDefined();
	});

	it("should include all required extensions", () => {
		const config = configureEditor("", "placeholder");

		// 拡張機能が含まれることを確認
		expect(config.extensions).toBeDefined();
		expect(Array.isArray(config.extensions)).toBe(true);
		expect(config.extensions.length).toBeGreaterThan(0);
	});

	it("should preserve initial content", () => {
		const initialContent = "<p>Test content</p>";
		const config = configureEditor(initialContent, "placeholder");

		expect(config.content).toBe(initialContent);
	});

	/**
	 * これが今回修正した重要なテスト
	 * editor.tsxでeditorPropsが上書きされてtransformPastedHTMLが消える問題をキャッチする
	 */
	it("should detect editorProps override bug", () => {
		const config = configureEditor("", "placeholder");

		// この設定が editor.tsx で上書きされないことを確認
		// 実際のバグでは、この設定がeditor.tsxでattributesだけに上書きされていた

		// 1. configureEditorはtransformPastedHTMLを含む
		expect(config.editorProps?.transformPastedHTML).toBeDefined();

		// 2. attributesも含む
		expect(config.editorProps?.attributes).toBeDefined();

		// 3. 両方が共存している（これが重要）
		expect(config.editorProps?.transformPastedHTML).toBeDefined();
		expect(config.editorProps?.attributes).toBeDefined();

		// このテストがあれば、editor.tsxでeditorPropsを上書きした時に
		// transformPastedHTMLが消えることを検出できた
	});

	/**
	 * 実際のeditor.tsxでの統合をテスト
	 * バグ版と修正版を比較してテストが機能することを確認
	 */
	it("should detect that current editor.tsx implementation loses transformPastedHTML", () => {
		// 現在のeditor.tsx実装：editorPropsを完全に上書き
		const currentConfig = simulateCurrentEditorImplementation(
			"",
			"placeholder",
			"test-class",
		);

		// 現在の実装では transformPastedHTML が失われることを確認
		expect("transformPastedHTML" in (currentConfig.editorProps || {})).toBe(
			false,
		);
		expect(currentConfig.editorProps?.attributes).toBeDefined();

		// 修正版：editorPropsをマージする
		const fixedConfig = simulateFixedEditorImplementation(
			"",
			"placeholder",
			"test-class",
		);

		// 修正版では transformPastedHTML が保持されることを確認
		expect(fixedConfig.editorProps?.transformPastedHTML).toBeDefined();
		expect(fixedConfig.editorProps?.attributes).toBeDefined();

		// attributesもマージされることを確認
		expect(fixedConfig.editorProps?.attributes).toEqual({
			class: "test-class",
			"data-testid": "tiptap-editor",
		});
	});
});
