import { HeaderFrame } from ".";
import { HeaderUserSlot } from "./user-slot.client";

export function Header({ locale }: { locale: string }) {
	return (
		<HeaderFrame
			brand={null}
			locale={locale}
			userSlot={<HeaderUserSlot locale={locale} />}
		/>
	);
}
