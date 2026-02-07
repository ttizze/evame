import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorBubbleMenu } from "./editor-bubble-menu.client";
import { EditorFloatingMenu } from "./editor-floating-menu";

const { menuPortalSpy } = vi.hoisted(() => {
	return {
		menuPortalSpy: vi.fn(),
	};
});

vi.mock("@radix-ui/react-dropdown-menu", () => ({
	Root: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="menu-root">{children}</div>
	),
	Trigger: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean;
		children: React.ReactNode;
	} & React.ComponentProps<"button">) =>
		asChild ? (
			children
		) : (
			<button {...props} type="button">
				{children}
			</button>
		),
	Portal: ({
		children,
		container,
	}: {
		children: React.ReactNode;
		container?: HTMLElement;
	}) => {
		menuPortalSpy(container);
		return (
			<div
				data-has-container={container ? "true" : "false"}
				data-testid="menu-portal"
			>
				{children}
			</div>
		);
	},
	Content: ({
		children,
		align,
		side,
		sideOffset,
	}: {
		children: React.ReactNode;
		align?: string;
		side?: string;
		sideOffset?: number;
	}) => {
		return (
			<div
				data-align={align}
				data-side={side}
				data-side-offset={sideOffset}
				data-testid="menu-content"
			>
				{children}
			</div>
		);
	},
	Item: ({
		children,
		onSelect,
	}: {
		children: React.ReactNode;
		onSelect?: () => void;
	}) => (
		<button onClick={onSelect} type="button">
			{children}
		</button>
	),
}));

vi.mock("@tiptap/react/menus", () => ({
	BubbleMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="bubble-menu">{children}</div>
	),
	FloatingMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="floating-menu">{children}</div>
	),
}));

function createEditorMock() {
	const chainResult = {
		focus: () => chainResult,
		setParagraph: () => chainResult,
		toggleHeading: () => chainResult,
		toggleBold: () => chainResult,
		toggleItalic: () => chainResult,
		toggleStrike: () => chainResult,
		toggleCode: () => chainResult,
		toggleCodeBlock: () => chainResult,
		toggleBulletList: () => chainResult,
		toggleOrderedList: () => chainResult,
		toggleBlockquote: () => chainResult,
		setLink: () => chainResult,
		unsetLink: () => chainResult,
		run: () => true,
	};

	return {
		chain: () => chainResult,
		getAttributes: () => ({}),
		isActive: () => false,
		off: vi.fn(),
		on: vi.fn(),
		state: {
			selection: {
				empty: false,
			},
		},
		view: {
			hasFocus: () => true,
		},
	};
}

describe("editor menu position", () => {
	it("FloatingMenuはPortalのcontainerに親要素を渡す", () => {
		render(<EditorFloatingMenu editor={createEditorMock() as never} />);
		expect(screen.getByTestId("menu-portal")).toHaveAttribute(
			"data-has-container",
			"true",
		);
	});

	it("FloatingMenuは右側開始でオフセット4のContentを使う", () => {
		render(<EditorFloatingMenu editor={createEditorMock() as never} />);
		expect(screen.getByTestId("menu-content")).toHaveAttribute(
			"data-side",
			"right",
		);
		expect(screen.getByTestId("menu-content")).toHaveAttribute(
			"data-align",
			"start",
		);
		expect(screen.getByTestId("menu-content")).toHaveAttribute(
			"data-side-offset",
			"4",
		);
	});

	it("BubbleMenuは下側開始でオフセット6のContentを使う", () => {
		render(<EditorBubbleMenu editor={createEditorMock() as never} />);
		expect(screen.getByTestId("menu-content")).toHaveAttribute(
			"data-side",
			"bottom",
		);
		expect(screen.getByTestId("menu-content")).toHaveAttribute(
			"data-align",
			"start",
		);
		expect(screen.getByTestId("menu-content")).toHaveAttribute(
			"data-side-offset",
			"6",
		);
	});
});
