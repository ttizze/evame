import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorBubbleMenu } from "./editor-bubble-menu.client";
import { EditorFloatingMenu } from "./editor-floating-menu";

const { menuPortalSpy, menuPositionerSpy } = vi.hoisted(() => {
	return {
		menuPortalSpy: vi.fn(),
		menuPositionerSpy: vi.fn(),
	};
});

vi.mock("@base-ui/react/menu", () => ({
	Menu: {
		Root: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="menu-root">{children}</div>
		),
		Trigger: ({
			children,
			nativeButton: _nativeButton,
			...props
		}: {
			children: React.ReactNode;
			nativeButton?: boolean;
		} & React.ComponentProps<"button">) => (
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
		Positioner: ({
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
			menuPositionerSpy({ align, side, sideOffset });
			return (
				<div
					data-align={align}
					data-side={side}
					data-side-offset={sideOffset}
					data-testid="menu-positioner"
				>
					{children}
				</div>
			);
		},
		Popup: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="menu-popup">{children}</div>
		),
		Item: ({
			children,
			onClick,
		}: {
			children: React.ReactNode;
			onClick?: () => void;
		}) => (
			<button onClick={onClick} type="button">
				{children}
			</button>
		),
	},
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

	it("FloatingMenuは右側開始でオフセット4のPositionerを使う", () => {
		render(<EditorFloatingMenu editor={createEditorMock() as never} />);
		expect(screen.getByTestId("menu-positioner")).toHaveAttribute(
			"data-side",
			"right",
		);
		expect(screen.getByTestId("menu-positioner")).toHaveAttribute(
			"data-align",
			"start",
		);
		expect(screen.getByTestId("menu-positioner")).toHaveAttribute(
			"data-side-offset",
			"4",
		);
	});

	it("BubbleMenuは下側開始でオフセット6のPositionerを使う", () => {
		render(<EditorBubbleMenu editor={createEditorMock() as never} />);
		expect(screen.getByTestId("menu-positioner")).toHaveAttribute(
			"data-side",
			"bottom",
		);
		expect(screen.getByTestId("menu-positioner")).toHaveAttribute(
			"data-align",
			"start",
		);
		expect(screen.getByTestId("menu-positioner")).toHaveAttribute(
			"data-side-offset",
			"6",
		);
	});
});
