import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { ModeToggle } from "./mode-toggle";

const theme = vi.hoisted(() => ({ resolvedTheme: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: "system", ...theme }),
}));

it.each(["light", "dark"])(
	"システム設定が%sのとき、名前付きのアイコンから反対のテーマへ切り替えられる",
	async (resolvedTheme) => {
		theme.resolvedTheme = resolvedTheme;
		const user = userEvent.setup();
		render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<ModeToggle showText={false} />
			</IntlProvider>,
		);
		await user.click(
			screen.getByRole("button", {
				name:
					resolvedTheme === "light"
						? "ダークテーマに切り替える"
						: "ライトテーマに切り替える",
			}),
		);
		expect(theme.setTheme).toHaveBeenLastCalledWith(
			resolvedTheme === "light" ? "dark" : "light",
		);
	},
);
